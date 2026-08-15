/**
 * Media upload UX: progress API + leave-page guard wiring.
 * Run: npx tsx scripts/media-upload-ux.selfcheck.ts
 */
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const uploader = fs.readFileSync(path.join(root, "components/admin/media-uploader.tsx"), "utf8")

assert.ok(uploader.includes("XMLHttpRequest"), "XHR for upload progress")
assert.ok(uploader.includes("beforeunload"), "warn before leaving during upload")
assert.ok(uploader.includes("Не закрывайте вкладку"), "explicit stay-on-page copy")
assert.ok(uploader.includes("toast.loading"), "loading toast")
assert.ok(uploader.includes("role=\"progressbar\""), "progressbar a11y")
assert.ok(uploader.includes("motion-reduce:"), "prefers-reduced-motion")
assert.ok(uploader.includes("onBusyChange"), "busy callback for page")

const explorer = fs.readFileSync(path.join(root, "components/admin/media-explorer.tsx"), "utf8")
assert.ok(explorer.includes("onBusyChange={setUploadBusy}"), "media page wires busy")

console.log("media-upload-ux.selfcheck: ok")
