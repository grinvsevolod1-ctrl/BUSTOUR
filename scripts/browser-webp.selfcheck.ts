/**
 * browser-webp helper is wired into MediaUploader.
 * Run: npx tsx scripts/browser-webp.selfcheck.ts
 */
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const uploader = fs.readFileSync(path.join(root, "components/admin/media-uploader.tsx"), "utf8")
assert.ok(uploader.includes("encodeImageFileToWebp"), "uploader converts images to webp")
assert.ok(fs.existsSync(path.join(root, "lib/browser-webp.ts")))
const src = fs.readFileSync(path.join(root, "lib/browser-webp.ts"), "utf8")
assert.ok(src.includes("image/webp"))
assert.ok(src.includes("toBlob"))
console.log("ok")
