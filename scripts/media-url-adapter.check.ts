import assert from "node:assert/strict"
import { uploadedFileFromUrl } from "../components/admin/media-uploader"

const image = uploadedFileFromUrl("/uploads/tour%20cover.png?version=2")
assert.deepEqual(image, {
  id: "/uploads/tour%20cover.png?version=2",
  url: "/uploads/tour%20cover.png?version=2",
  name: "tour cover.png",
  size: "",
  type: "image",
})

const video = uploadedFileFromUrl("https://cdn.example.com/media/clip.mp4#preview")
assert.equal(video.id, video.url)
assert.equal(video.name, "clip.mp4")
assert.equal(video.size, "")
assert.equal(video.type, "video")

const unknown = uploadedFileFromUrl("/media/no-extension")
assert.equal(unknown.name, "no-extension")
assert.equal(unknown.type, "image")

console.log("media URL adapter checks passed")
