import assert from "node:assert/strict"
import { getSchema } from "@tiptap/core"
import StarterKit from "@tiptap/starter-kit"
import { SeoYoutube } from "../components/admin/editor/youtube-extension"

const schema = getSchema([StarterKit, SeoYoutube.configure({ nocookie: true })])
const youtube = schema.nodes.youtube

assert.equal(youtube.spec.attrs?.alignment?.default, "center")
assert.equal(youtube.spec.attrs?.width?.default, null)

const node = youtube.create({
  src: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  width: "50%",
  alignment: "right",
})

const dom = youtube.spec.toDOM?.(node) as unknown[]
assert.ok(Array.isArray(dom))
assert.equal(dom[0], "div")

const attrs = dom[1] as Record<string, unknown>
assert.equal(attrs["data-youtube-video"], "")
assert.equal(attrs["data-align"], "right")
assert.equal(attrs.class, "seo-media seo-align-right")
assert.equal(attrs.style, "width:50%")

const iframe = dom[2] as unknown[]
assert.equal(iframe[0], "iframe")
const iframeAttrs = iframe[1] as Record<string, unknown>
assert.match(String(iframeAttrs.src), /youtube-nocookie\.com\/embed\/dQw4w9WgXcQ/)

console.log("seo youtube extension checks passed")
