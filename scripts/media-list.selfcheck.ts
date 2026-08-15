/**
 * Gallery slots: identical uploads share media.id — remove/patch by index only.
 * Run: npx tsx scripts/media-list.selfcheck.ts
 */
import assert from "node:assert/strict"
import { moveMediaAt, patchMediaAt, removeMediaAt } from "@/lib/media-list"
import type { UploadedFile } from "@/components/admin/media-uploader"

const a: UploadedFile = {
  id: "same",
  url: "https://blob.example/a.jpg",
  name: "a.jpg",
  size: "1 KB",
  type: "image",
}
const list = [a, { ...a }, { ...a, customAlt: "x" }]

const afterRemove = removeMediaAt(list, 1)
assert.equal(afterRemove.length, 2)
assert.equal(afterRemove[0]!.id, "same")
assert.equal(afterRemove[1]!.customAlt, "x")

// Bug we fix: filter by id would wipe all three
assert.notEqual(
  list.filter((item) => item.id !== a.id).length,
  afterRemove.length,
)

const patched = patchMediaAt(list, 0, { ...a, customAlt: "only-first" })
assert.equal(patched[0]!.customAlt, "only-first")
assert.equal(patched[1]!.customAlt, undefined)
assert.equal(patched[2]!.customAlt, "x")

const ordered = [
  { ...a, customAlt: "first" },
  { ...a, customAlt: "second" },
  { ...a, customAlt: "third" },
]
const moved = moveMediaAt(ordered, 2, 0)
assert.equal(moved[0]!.customAlt, "third")
assert.equal(moved[1]!.customAlt, "first")
assert.equal(moved[2]!.customAlt, "second")
assert.equal(moveMediaAt(ordered, 0, 0), ordered)
assert.equal(moveMediaAt(ordered, -1, 0), ordered)

console.log("media-list.selfcheck: ok")
