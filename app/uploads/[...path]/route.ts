import { readFile } from "node:fs/promises"
import path from "node:path"
import { NextResponse } from "next/server"
import { resolveUploadDiskPath, uploadsDirectory } from "@/lib/upload-fs"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const mimeByExt: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".pdf": "application/pdf",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".xls": "application/vnd.ms-excel",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".doc": "application/msword",
  ".txt": "text/plain",
}

/**
 * Serve runtime uploads for Docker/standalone.
 * Next standalone does not reliably serve files written to public/ after boot
 * (404 with prerender cache) — this route reads from disk on each GET.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const parts = (await context.params).path
  if (!parts?.length) return new NextResponse("Not Found", { status: 404 })

  const diskPath = resolveUploadDiskPath(parts.join("/"), uploadsDirectory())
  if (!diskPath) return new NextResponse("Not Found", { status: 404 })

  try {
    const bytes = await readFile(diskPath)
    const ext = path.extname(diskPath).toLowerCase()
    const type = mimeByExt[ext] || "application/octet-stream"
    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type": type,
        "Content-Length": String(bytes.length),
        "Cache-Control": "public, max-age=86400",
      },
    })
  } catch {
    return new NextResponse("Not Found", { status: 404 })
  }
}
