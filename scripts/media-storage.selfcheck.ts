/**
 * Media storage helpers — LOCAL DISK ONLY.
 * Vercel Blob intentionally disabled (removed).
 * Run: npx tsx scripts/media-storage.selfcheck.ts
 */
import assert from "node:assert/strict"
import { isRemoteMediaUrl, mediaStorageMode } from "../lib/media/storage"
import { resolveUploadContentType } from "../lib/media/utils"

// mediaStorageMode ALWAYS returns "local" now — no Vercel Blob, no exceptions.
assert.equal(mediaStorageMode({}), "local")
assert.equal(mediaStorageMode({ BLOB_READ_WRITE_TOKEN: "" }), "local")
assert.equal(mediaStorageMode({ BLOB_READ_WRITE_TOKEN: "vercel_blob_rw_x" }), "local")
assert.equal(mediaStorageMode({ BLOB_STORE_ID: "store_x" }), "local")
assert.equal(
  mediaStorageMode({ BLOB_STORE_ID: "store_x", VERCEL_OIDC_TOKEN: "oidc" }),
  "local",
)
assert.equal(mediaStorageMode({ BLOB_STORE_ID: "store_x", VERCEL: "1" }), "local")

// isRemoteMediaUrl still works for historical media imported from Blob.
assert.equal(isRemoteMediaUrl("/uploads/a.jpg"), false)
assert.equal(isRemoteMediaUrl("https://xyz.public.blob.vercel-storage.com/a.jpg"), true)
assert.equal(isRemoteMediaUrl("http://localhost:3000/uploads/a.jpg"), true)

assert.equal(resolveUploadContentType("clip.mp4", "", "video"), "video/mp4")
assert.equal(resolveUploadContentType("clip.mp4", "application/octet-stream", "video"), "video/mp4")
assert.equal(resolveUploadContentType("pic.png", "image/png", "image"), "image/png")

console.log("media-storage.selfcheck ok (LOCAL DISK ONLY — Blob disabled)")
