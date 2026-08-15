/**
 * MEDIA_SKIP_WEBP skips sharp; otherwise converts when sharp works.
 * Run: npx tsx scripts/media-skip-webp.selfcheck.ts
 */
import assert from "node:assert/strict"
import { imageBytesForUpload } from "../lib/media-webp"

const png1x1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
)

async function main() {
  process.env.MEDIA_SKIP_WEBP = "1"
  const skipped = await imageBytesForUpload(png1x1, "a.png", "image/png", ".png")
  assert.equal(skipped.ext, ".png")
  assert.equal(skipped.contentType, "image/png")
  assert.equal(skipped.bytes.equals(png1x1), true)

  delete process.env.MEDIA_SKIP_WEBP
  // May convert or fall back depending on host sharp — must not throw
  const out = await imageBytesForUpload(png1x1, "a.png", "image/png", ".png")
  assert.ok(out.bytes.length > 0)
  assert.ok(out.name)

  console.log("ok")
}

void main()
