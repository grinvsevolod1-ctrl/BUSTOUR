/**
 * GalleryBuilder: image+video accept; MediaUploader multiple has reorder.
 * Run: npx tsx scripts/gallery-builder.selfcheck.ts
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const root = process.cwd()
const builder = readFileSync(join(root, "components/admin/gallery-builder.tsx"), "utf8")
const uploader = readFileSync(join(root, "components/admin/media-uploader.tsx"), "utf8")
const gallery = readFileSync(join(root, "components/site/tour-gallery.tsx"), "utf8")

assert.match(builder, /accept=\{\["image", "video"\]\}/, "gallery accepts image+video")
assert.match(uploader, /moveMediaAt/, "uploader reorders via moveMediaAt")
assert.match(uploader, /draggable=\{canReorder\}/, "uploader DnD when multiple")
assert.match(uploader, /aria-label="Выше"/, "uploader up button")
assert.match(gallery, /isVideoUrl/, "public gallery detects video")
assert.match(gallery, /<video/, "public gallery renders video element")

console.log("gallery-builder.selfcheck: ok")
