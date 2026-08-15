import assert from "node:assert/strict"
import {
  detectType,
  extToType,
  formatBytes,
  uploadedFileFromUrl,
} from "../components/admin/media-uploader"
import { isMediaReady, toUploadedFile } from "@/lib/media/types"
import { resolveUploadContentType, validateMediaMeta } from "@/lib/media/utils"

assert.equal(formatBytes(1024), "1.0 KB")
assert.equal(formatBytes(2517527), "2.4 MB")
assert.equal(extToType("a.pdf"), "document")
assert.equal(extToType("a.mp4"), "video")
assert.equal(extToType("a.png"), "image")
assert.equal(detectType("a.pdf"), "document")
assert.equal(detectType("a.mp4"), "video")
assert.equal(detectType("a.png"), "image")
assert.equal(detectType({ name: "unknown", type: "video/mp4" }), "video")
assert.equal(validateMediaMeta("photo.png", "image/png", 1024, 200 * 1024 * 1024).type, "image")
assert.match(
  validateMediaMeta("photo.png", "image/png", 201 * 1024 * 1024, 200 * 1024 * 1024).error ?? "",
  /200\.0 MB/,
)
assert.equal(validateMediaMeta("payload.exe", "application/octet-stream", 100, 200 * 1024 * 1024).type, null)
assert.equal(resolveUploadContentType("a.mp4", "", "video"), "video/mp4")
assert.equal(resolveUploadContentType("a.jpg", "application/octet-stream", "image"), "image/jpeg")
assert.equal(uploadedFileFromUrl("/uploads/test-file.mp4").name, "test-file.mp4")
assert.equal(isMediaReady({ id: "1", url: "/u", name: "x.webm", size: "1 MB", type: "video", status: "ready", processingStage: "ready" }), true)
assert.equal(isMediaReady({ id: "2", url: "/u", name: "x.webm", size: "1 MB", type: "video", status: "processing", processingStage: "queued" }), false)
assert.deepEqual(
  toUploadedFile({
    id: "3",
    url: "/uploads/file.webm",
    name: "file.webm",
    size: "1 MB",
    type: "video",
    folderId: "folder",
    status: "failed",
    processingStage: "failed",
    errorMessage: "boom",
    mimeType: "video/webm",
  }),
  {
    id: "3",
    url: "/uploads/file.webm",
    name: "file.webm",
    size: "1 MB",
    type: "video",
    alt: undefined,
    customAlt: undefined,
    folderId: "folder",
  },
)

console.log("media-uploader checks passed")

