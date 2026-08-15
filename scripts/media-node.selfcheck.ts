import assert from "node:assert/strict"
import {
  coerceMediaNode,
  coerceMediaNodeList,
  instanceAltPlaceholder,
  resolveImageAlt,
  serializeMediaNode,
  serializeMediaNodeList,
} from "@/lib/media/node"

assert.deepEqual(coerceMediaNode("/uploads/a.jpg"), { url: "/uploads/a.jpg" })
assert.deepEqual(coerceMediaNode({ url: "/uploads/a.jpg", mediaId: "uuid-1", customAlt: " Салон " }), {
  url: "/uploads/a.jpg",
  mediaId: "uuid-1",
  customAlt: "Салон",
})
assert.deepEqual(coerceMediaNode(JSON.stringify({ url: "/x.png", mediaId: "m1" })), {
  url: "/x.png",
  mediaId: "m1",
})
assert.equal(coerceMediaNode(""), null)
assert.equal(coerceMediaNode(null), null)

assert.deepEqual(coerceMediaNodeList(["/a.jpg", { url: "/b.jpg", customAlt: "B" }]), [
  { url: "/a.jpg" },
  { url: "/b.jpg", customAlt: "B" },
])
assert.deepEqual(coerceMediaNodeList('["/a.jpg"]'), [{ url: "/a.jpg" }])

assert.equal(resolveImageAlt({ customAlt: "C", defaultAlt: "D", entityTitle: "T" }), "C")
assert.equal(resolveImageAlt({ customAlt: "", defaultAlt: "D", entityTitle: "T" }), "D")
assert.equal(resolveImageAlt({ defaultAlt: "", entityTitle: "T" }), "T")
assert.equal(resolveImageAlt({}), "")

assert.equal(instanceAltPlaceholder("  Салон  "), "пусто = Салон")
assert.equal(instanceAltPlaceholder(""), "пусто")
assert.equal(instanceAltPlaceholder(null), "пусто")
assert.equal(instanceAltPlaceholder(undefined), "пусто")

assert.equal(serializeMediaNode({ url: "/a.jpg" }), "/a.jpg")
assert.equal(
  serializeMediaNode({ url: "/a.jpg", mediaId: "m1", customAlt: "X" }),
  JSON.stringify({ url: "/a.jpg", mediaId: "m1", customAlt: "X" }),
)
assert.equal(
  serializeMediaNodeList([{ url: "/a.jpg" }, { url: "/b.jpg", mediaId: "m2" }]),
  JSON.stringify([{ url: "/a.jpg" }, { url: "/b.jpg", mediaId: "m2" }]),
)

console.log("media-node.selfcheck: ok")
