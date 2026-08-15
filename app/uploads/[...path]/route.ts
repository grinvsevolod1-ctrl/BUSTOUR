import { createReadStream } from "node:fs"
import { stat } from "node:fs/promises"
import path from "node:path"
import { Readable } from "node:stream"
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

/** Parses a single `bytes=start-end` range. Multi-range requests fall back to full body. */
function parseRange(header: string | null, size: number): { start: number; end: number } | null {
  if (!header) return null
  const m = /^bytes=(\d*)-(\d*)$/.exec(header.trim())
  if (!m) return null
  const [, startRaw, endRaw] = m
  if (!startRaw && !endRaw) return null

  if (!startRaw) {
    // Suffix range: last N bytes
    const suffix = Number(endRaw)
    if (!Number.isFinite(suffix) || suffix <= 0) return null
    const start = Math.max(0, size - suffix)
    return { start, end: size - 1 }
  }

  const start = Number(startRaw)
  const end = endRaw ? Number(endRaw) : size - 1
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null
  if (start > end || start >= size) return null
  return { start, end: Math.min(end, size - 1) }
}

function streamFile(diskPath: string, start?: number, end?: number): ReadableStream {
  const nodeStream =
    start !== undefined && end !== undefined
      ? createReadStream(diskPath, { start, end })
      : createReadStream(diskPath)
  return Readable.toWeb(nodeStream) as ReadableStream
}

/**
 * Serve runtime uploads from disk with streaming + HTTP Range support.
 *
 * Why streaming: files are read via createReadStream — большой mp4 больше не
 * загружается целиком в память процесса (раньше readFile → риск OOM).
 * Why Range: перемотка видео и корректное воспроизведение mp4 в Safari
 * требуют ответов 206 Partial Content.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const parts = (await context.params).path
  if (!parts?.length) return new NextResponse("Not Found", { status: 404 })

  const diskPath = resolveUploadDiskPath(parts.join("/"), uploadsDirectory())
  if (!diskPath) return new NextResponse("Not Found", { status: 404 })

  let info: Awaited<ReturnType<typeof stat>>
  try {
    info = await stat(diskPath)
    if (!info.isFile()) return new NextResponse("Not Found", { status: 404 })
  } catch {
    return new NextResponse("Not Found", { status: 404 })
  }

  const ext = path.extname(diskPath).toLowerCase()
  const type = mimeByExt[ext] || "application/octet-stream"
  const size = info.size
  const etag = `"${size.toString(16)}-${Math.trunc(info.mtimeMs).toString(16)}"`

  const baseHeaders: Record<string, string> = {
    "Content-Type": type,
    "Cache-Control": "public, max-age=86400",
    "Accept-Ranges": "bytes",
    ETag: etag,
    "Last-Modified": info.mtime.toUTCString(),
  }

  // Conditional GET — let browsers reuse their cache.
  if (request.headers.get("if-none-match") === etag) {
    return new NextResponse(null, { status: 304, headers: baseHeaders })
  }

  const range = parseRange(request.headers.get("range"), size)
  if (range) {
    const { start, end } = range
    return new NextResponse(streamFile(diskPath, start, end), {
      status: 206,
      headers: {
        ...baseHeaders,
        "Content-Range": `bytes ${start}-${end}/${size}`,
        "Content-Length": String(end - start + 1),
      },
    })
  }

  // Explicit unsatisfiable range (e.g. start beyond EOF)
  if (request.headers.get("range")) {
    return new NextResponse(null, {
      status: 416,
      headers: { ...baseHeaders, "Content-Range": `bytes */${size}` },
    })
  }

  return new NextResponse(streamFile(diskPath), {
    status: 200,
    headers: { ...baseHeaders, "Content-Length": String(size) },
  })
}
