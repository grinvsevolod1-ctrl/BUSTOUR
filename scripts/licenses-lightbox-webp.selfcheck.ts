/**
 * #86 — licenses lightbox + WebP on image upload.
 * Run: npx tsx scripts/licenses-lightbox-webp.selfcheck.ts
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import sharp from "sharp"
import { imageBytesToWebp } from "../lib/media-webp"

async function main() {
  const root = process.cwd()
  const licenses = readFileSync(join(root, "app/(site)/company/licenses/page.tsx"), "utf8")
  const lightbox = readFileSync(join(root, "components/site/image-lightbox.tsx"), "utf8")
  const mediaService = readFileSync(join(root, "lib/media-service.ts"), "utf8")

  assert.match(licenses, /ImageLightbox/, "licenses page uses ImageLightbox")
  assert.match(
    licenses,
    /group-hover:scale-105/,
    "licenses images zoom on hover like tour cards",
  )
  assert.match(
    licenses,
    /transition-transform duration-500/,
    "licenses image zoom uses card transition",
  )
  assert.match(lightbox, /Escape/, "lightbox closes on Escape")
  assert.match(lightbox, /aria-label=\"Закрыть\"/, "lightbox has close button")
  assert.match(lightbox, /cursor-zoom-in/, "thumb is clickable zoom")
  assert.match(lightbox, /createPortal/, "portal escapes overflow-hidden thumbs")
  assert.match(lightbox, /document\.body/, "portal target is body")
  assert.match(lightbox, /overflow\s*=\s*[\"']hidden[\"']/, "body scroll lock while open")

  const gallery = readFileSync(join(root, "components/site/tour-gallery.tsx"), "utf8")
  assert.match(gallery, /createPortal/, "tour gallery lightbox also portals")
  assert.match(gallery, /h-11 w-11/, "gallery expand/nav touch ≥44")
  assert.match(mediaService, /imageBytesForUpload|imageBytesToWebp/, "saveFile converts images via webp helper")
  assert.match(mediaService, /job\.type === \"image\"/, "only images go through WebP path")

  const png = await sharp({
    create: { width: 8, height: 8, channels: 3, background: { r: 20, g: 40, b: 60 } },
  })
    .png()
    .toBuffer()

  const webp = await imageBytesToWebp(png, "cert.png")
  assert.equal(webp.contentType, "image/webp")
  assert.equal(webp.ext, ".webp")
  assert.equal(webp.name, "cert.webp")
  assert.ok(webp.bytes.length > 0, "webp bytes non-empty")
  const meta = await sharp(webp.bytes).metadata()
  assert.equal(meta.format, "webp")

  console.log("licenses-lightbox-webp.selfcheck: ok")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
