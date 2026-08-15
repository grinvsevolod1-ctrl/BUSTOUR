/**
 * Optional ffmpeg video normalize: scale longest side ≤ 1080, encode WebM (VP9).
 * Uses PATH `ffmpeg` or FFMPEG_PATH. No-op when binary missing / encode fails.
 */
import { spawn } from "node:child_process"
import { randomUUID } from "node:crypto"
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { MEDIA_MAX_HEIGHT_PX } from "@/lib/media/utils"

export type VideoProcessResult = {
  bytes: Buffer
  contentType: string
  ext: string
  name: string
  converted: boolean
}

function ffmpegBin(): string {
  const fromEnv = (process.env.FFMPEG_PATH || "").trim()
  return fromEnv || "ffmpeg"
}

function webmName(originalName: string): string {
  const base = originalName.replace(/\.[^.]+$/, "") || "video"
  return `${base}.webm`
}

function run(cmd: string, args: string[], timeoutMs: number): Promise<{ code: number; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { windowsHide: true })
    let stderr = ""
    const timer = setTimeout(() => {
      child.kill("SIGKILL")
      resolve({ code: 1, stderr: stderr || "ffmpeg timeout" })
    }, timeoutMs)
    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8")
    })
    child.on("error", (err) => {
      clearTimeout(timer)
      resolve({ code: 1, stderr: err.message })
    })
    child.on("close", (code) => {
      clearTimeout(timer)
      resolve({ code: code ?? 1, stderr })
    })
  })
}

let ffmpegOk: boolean | null = null

/** Cached probe — false on hosts without ffmpeg. */
export async function isFfmpegAvailable(): Promise<boolean> {
  if (ffmpegOk != null) return ffmpegOk
  const { code } = await run(ffmpegBin(), ["-version"], 8_000)
  ffmpegOk = code === 0
  return ffmpegOk
}

/**
 * Convert video → WebM VP9, scale inside 1080 (no upscale).
 * Returns original bytes when ffmpeg missing or encode fails.
 */
export async function videoBytesForUpload(
  bytes: Buffer,
  originalName: string,
  originalContentType: string,
  originalExt: string,
): Promise<VideoProcessResult> {
  const original: VideoProcessResult = {
    bytes,
    contentType: originalContentType || "application/octet-stream",
    ext: originalExt,
    name: originalName,
    converted: false,
  }

  if (!(await isFfmpegAvailable())) return original

  const dir = await mkdtemp(path.join(tmpdir(), "bustour-vid-"))
  const inExt = originalExt && originalExt.startsWith(".") ? originalExt : ".mp4"
  const inPath = path.join(dir, `in${inExt}`)
  const outPath = path.join(dir, `out-${randomUUID()}.webm`)

  try {
    await writeFile(inPath, bytes)
    // Height ≤ 1080; width even for VP9 (-2). No upscale when ih < 1080.
    const scale = `scale=-2:'min(${MEDIA_MAX_HEIGHT_PX},ih)'`
    const { code, stderr } = await run(
      ffmpegBin(),
      [
        "-y",
        "-i",
        inPath,
        "-vf",
        scale,
        "-c:v",
        "libvpx-vp9",
        "-crf",
        "20",
        "-b:v",
        "0",
        "-row-mt",
        "1",
        "-c:a",
        "libopus",
        "-b:a",
        "128k",
        "-f",
        "webm",
        outPath,
      ],
      10 * 60_000,
    )
    if (code !== 0) {
      console.error("[media-ffmpeg] encode failed", stderr.slice(-800))
      return original
    }
    const out = await readFile(outPath)
    if (!out.length) return original
    return {
      bytes: out,
      contentType: "video/webm",
      ext: ".webm",
      name: webmName(originalName),
      converted: true,
    }
  } catch (err) {
    console.error("[media-ffmpeg] error", err)
    return original
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {})
  }
}
