import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { writeAudit } from "@/lib/admin-audit"
import { mediaService } from "@/lib/media/service"

export const runtime = "nodejs"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin().catch(() => null)
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  let body: { alt?: unknown; folderId?: unknown }
  try {
    body = (await request.json()) as { alt?: unknown; folderId?: unknown }
  } catch {
    return NextResponse.json({ error: "Некорректный JSON." }, { status: 400 })
  }

  const hasAlt = "alt" in body
  const hasFolder = "folderId" in body
  if (!hasAlt && !hasFolder) {
    return NextResponse.json({ error: "Нечего обновлять." }, { status: 400 })
  }

  let updated = null
  try {
    if (hasAlt) {
      const alt = typeof body.alt === "string" ? body.alt : ""
      updated = await mediaService.updateAlt(id, alt)
      if (!updated) return NextResponse.json({ error: "Файл не найден." }, { status: 404 })
    }
    if (hasFolder) {
      const folderId =
        body.folderId == null || body.folderId === "" || body.folderId === "root"
          ? null
          : typeof body.folderId === "string"
            ? body.folderId
            : null
      if (body.folderId != null && body.folderId !== "" && body.folderId !== "root" && typeof body.folderId !== "string") {
        return NextResponse.json({ error: "Некорректный folderId." }, { status: 400 })
      }
      updated = await mediaService.updateFolder(id, folderId)
      if (!updated) return NextResponse.json({ error: "Файл не найден." }, { status: 404 })
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Не удалось обновить."
    return NextResponse.json({ error: message }, { status: 400 })
  }

  await writeAudit({
    admin,
    action: "media_update",
    entityType: "media",
    entityId: id,
    summary: hasFolder
      ? `Перемещён медиафайл #${id}`
      : `Обновлён alt медиа #${id}`,
    after: {
      ...(hasAlt ? { alt: typeof body.alt === "string" ? body.alt : "" } : {}),
      ...(hasFolder ? { folderId: updated?.folderId ?? null } : {}),
    },
  })
  return NextResponse.json(updated)
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ok = await requireAdmin().catch(() => null)
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const file = await mediaService.getMediaById(id)
  if (!file) return NextResponse.json({ error: "Файл не найден." }, { status: 404 })
  return NextResponse.json(file)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin().catch(() => null)
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  let deleted = false
  try {
    deleted = await mediaService.deleteFile(id)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Не удалось удалить файл."
    return NextResponse.json({ error: message }, { status: 400 })
  }
  if (!deleted) return NextResponse.json({ error: "Файл не найден." }, { status: 404 })
  await writeAudit({
    admin,
    action: "media_delete",
    entityType: "media",
    entityId: id,
    summary: `Удалён медиафайл #${id}`,
  })
  return NextResponse.json({ ok: true })
}
