import assert from "node:assert/strict"
import { shouldReuseMedia } from "../lib/media/dedupe"

const existing = { id: "existing", url: "/uploads/existing.png", name: "existing.png", size: "1 KB", type: "image" as const }
let writes = 0

if (shouldReuseMedia(existing)) {
  writes += 0
} else {
  writes += 1
}
assert.equal(writes, 0)

let created = 0
if (!shouldReuseMedia(undefined)) {
  created += 1
}
assert.equal(created, 1)

console.log("media dedupe checks passed")
