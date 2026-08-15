import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { writeAudit } from "@/lib/admin-audit"
import { mediaService, validateMediaFile } from "@/lib/media-service"

export const runtime = "nodejs"
/** Video ffmpeg encode can be slow on large files. */
export const maxDuration = 300

export async function POST(request: Request) {
  const admin = await requireAdmin().catch(() => null)
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const formData = await request.formData()
  const entries = [...formData.getAll("files"), formData.get("file")]
  const files = entries.filter((entry): entry is File => entry instanceof File)
  if (!files.length) {
    return NextResponse.json({ error: "Файл не найден в запросе." }, { status: 400 })
  }

  const folderRaw = formData.get("folderId")
  const folderId =
    typeof folderRaw === "string" && folderRaw.trim() ? folderRaw.trim() : null

  const invalid = files
    .map((file) => ({ file, validation: validateMediaFile(file) }))
    .filter(({ validation }) => !validation.type)
  if (invalid.length) {
    return NextResponse.json(
      { error: invalid.map(({ file, validation }) => `«${file.name}»: ${validation.error}`).join(" ") },
      { status: 400 },
    )
  }

  try {
    const uploaded = await Promise.all(
      files.map((file) => mediaService.saveFile(file, { folderId })),
    )
    await writeAudit({
      admin,
      action: "media_upload",
      entityType: "media",
      entityId: uploaded.map((f) => f.id).join(",") || undefined,
      summary:
        uploaded.length === 1
          ? `Загружен файл «${files[0]?.name || "media"}»`
          : `Загружено файлов: ${uploaded.length}`,
      after: { count: uploaded.length, names: files.map((f) => f.name), ids: uploaded.map((f) => f.id) },
    })
    return NextResponse.json(uploaded.length === 1 ? uploaded[0] : uploaded)
  } catch (error) {
    console.error("[media/upload]", error)
    const msg = error instanceof Error ? error.message : String(error)
    const detail = msg.trim() ? ` ${msg.replace(/\s+/g, " ").slice(0, 240)}` : ""
    return NextResponse.json({ error: `Не удалось сохранить файл.${detail}` }, { status: 500 })
  }
}
