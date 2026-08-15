/**
 * Media normalize: height≤1080 WebP, optional ffmpeg→WebM, 200MB ceiling.
 * Run: npx tsx scripts/media-normalize.selfcheck.ts
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { spawn } from "node:child_process"
import { mkdtemp, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import sharp from "sharp"
import {
  MAX_MEDIA_SIZE_BYTES,
  MAX_MEDIA_SIZE_MB,
  MEDIA_MAX_HEIGHT_PX,
} from "../lib/media-utils"
import { imageBytesToWebp } from "../lib/media-webp"
import { isFfmpegAvailable, videoBytesForUpload } from "../lib/media-ffmpeg"

const root = process.cwd()

assert.equal(MAX_MEDIA_SIZE_MB, 200)
assert.equal(MAX_MEDIA_SIZE_BYTES, 200 * 1024 * 1024)
assert.equal(MEDIA_MAX_HEIGHT_PX, 1080)

const mediaService = readFileSync(join(root, "lib/media-service.ts"), "utf8")
assert.match(mediaService, /videoBytesForUpload/, "saveFile runs video normalize")
assert.match(mediaService, /MAX_MEDIA_SIZE_BYTES/, "size ceiling used")

const uploader = readFileSync(join(root, "components/admin/media-uploader.tsx"), "utf8")
assert.match(uploader, /Сжатие/, "UI shows compress stage")
assert.match(uploader, /MAX_MEDIA_SIZE_MB/, "uploader default limit from shared const")

async function main() {
  delete process.env.MEDIA_SKIP_WEBP

  const tall = await sharp({
    create: { width: 1200, height: 2000, channels: 3, background: { r: 10, g: 20, b: 30 } },
  })
    .png()
    .toBuffer()
  const tallOut = await imageBytesToWebp(tall, "tall.png")
  assert.equal(tallOut.contentType, "image/webp")
  const tallMeta = await sharp(tallOut.bytes).metadata()
  assert.equal(tallMeta.format, "webp")
  assert.ok((tallMeta.height ?? 9999) <= MEDIA_MAX_HEIGHT_PX, "tall image height capped")
  assert.ok((tallMeta.height ?? 0) > 0)

  const small = await sharp({
    create: { width: 400, height: 300, channels: 3, background: { r: 200, g: 100, b: 50 } },
  })
    .png()
    .toBuffer()
  const smallOut = await imageBytesToWebp(small, "small.png")
  const smallMeta = await sharp(smallOut.bytes).metadata()
  assert.equal(smallMeta.height, 300, "small image not upscaled")
  assert.equal(smallMeta.width, 400)

  const ffmpegOk = await isFfmpegAvailable()
  console.log(`ffmpeg available: ${ffmpegOk}`)

  if (ffmpegOk) {
    const dir = await mkdtemp(path.join(tmpdir(), "bustour-ff-self-"))
    try {
      const src = path.join(dir, "src.mp4")
      await new Promise<void>((resolve, reject) => {
        const child = spawn(
          process.env.FFMPEG_PATH || "ffmpeg",
          [
            "-y",
            "-f",
            "lavfi",
            "-i",
            "color=c=red:s=1280x720:d=0.4",
            "-c:v",
            "libx264",
            "-pix_fmt",
            "yuv420p",
            src,
          ],
          { windowsHide: true },
        )
        child.on("error", reject)
        child.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`src encode ${code}`))))
      })
      const mp4 = await readFile(src)
      const converted = await videoBytesForUpload(mp4, "clip.mp4", "video/mp4", ".mp4")
      assert.equal(converted.converted, true, "ffmpeg converts mp4→webm")
      assert.equal(converted.contentType, "video/webm")
      assert.equal(converted.ext, ".webm")
      assert.ok(converted.bytes.length > 0)
    } finally {
      await rm(dir, { recursive: true, force: true }).catch(() => {})
    }
  } else {
    const fake = Buffer.from("not-a-video")
    const skipped = await videoBytesForUpload(fake, "x.mp4", "video/mp4", ".mp4")
    assert.equal(skipped.converted, false, "without ffmpeg keep original")
  }

  console.log("media-normalize.selfcheck: ok")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
