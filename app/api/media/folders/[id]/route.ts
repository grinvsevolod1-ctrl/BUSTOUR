import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { writeAudit } from "@/lib/admin-audit"
import { deleteMediaFolder } from "@/lib/media-folder-service"

export const runtime = "nodejs"

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin().catch(() => null)
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const deleted = await deleteMediaFolder(id)
  if (!deleted) return NextResponse.json({ error: "Папка не найдена." }, { status: 404 })
  await writeAudit({
    admin,
    action: "media_folder_delete",
    entityType: "media_folder",
    entityId: id,
    summary: `Удалена папка медиа #${id}`,
  })
  return NextResponse.json({ ok: true })
}
