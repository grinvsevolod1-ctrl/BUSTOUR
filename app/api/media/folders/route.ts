import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { writeAudit } from "@/lib/admin-audit"
import {
  createMediaFolder,
  listMediaFolders,
} from "@/lib/media/folder-service"

export const runtime = "nodejs"

export async function GET() {
  const ok = await requireAdmin().catch(() => null)
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const folders = await listMediaFolders()
  return NextResponse.json(folders)
}

export async function POST(request: Request) {
  const admin = await requireAdmin().catch(() => null)
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: { name?: unknown }
  try {
    body = (await request.json()) as { name?: unknown }
  } catch {
    return NextResponse.json({ error: "Некорректный JSON." }, { status: 400 })
  }

  const name = typeof body.name === "string" ? body.name : ""
  try {
    const folder = await createMediaFolder(name)
    await writeAudit({
      admin,
      action: "media_folder_create",
      entityType: "media_folder",
      entityId: folder.id,
      summary: `Создана папка медиа «${folder.name}»`,
      after: folder,
    })
    return NextResponse.json(folder)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Не удалось создать папку."
    const status = /уже существует|Укажите/.test(message) ? 400 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
