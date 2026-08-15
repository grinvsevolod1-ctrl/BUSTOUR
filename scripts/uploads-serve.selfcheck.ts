/**
 * Upload disk path safety + route exists for standalone serving.
 * Run: npx tsx scripts/uploads-serve.selfcheck.ts
 */
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { resolveUploadDiskPath, uploadsDirectory } from "../lib/upload-fs"

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const dir = uploadsDirectory({ UPLOADS_DIR: path.join(root, "public", "uploads") })

assert.equal(resolveUploadDiskPath("../etc/passwd", dir), null)
assert.equal(resolveUploadDiskPath("/uploads/../../etc/passwd", dir), null)
assert.equal(resolveUploadDiskPath("foo/../../../etc/passwd", dir), null)

const ok = resolveUploadDiskPath("/uploads/a.png", dir)
assert.ok(ok)
assert.equal(ok, path.join(dir, "a.png"))

assert.ok(fs.existsSync(path.join(root, "app/uploads/[...path]/route.ts")))
const route = fs.readFileSync(path.join(root, "app/uploads/[...path]/route.ts"), "utf8")
assert.ok(route.includes("resolveUploadDiskPath"))
assert.ok(route.includes("force-dynamic"))

console.log("ok")
