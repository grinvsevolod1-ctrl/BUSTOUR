import { readFileSync } from "node:fs"
import assert from "node:assert/strict"
import path from "node:path"

const ROOT = process.cwd()

function read(rel: string) {
  return readFileSync(path.join(ROOT, rel), "utf8")
}

import { sanitizeCmsHtml } from "../lib/sanitize-html"
import { normalizeMediaHeight, normalizeMediaWidth } from "../components/admin/editor/media-helpers"

// --- 1. Sanitizer preserves iframe + width/height/style for YouTube wrapper ---
const youtubeRendered = `
<p>Intro</p>
<div data-youtube-video="" data-align="center" class="seo-media seo-align-center" style="width:1280px;height:720px">
  <iframe
    src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0&amp;controls=1"
    allowfullscreen
    frameborder="0"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
    title="Test YouTube"></iframe>
</div>
<p>Outro</p>`

const sanitized = sanitizeCmsHtml(youtubeRendered)

// iframe tag itself was preserved
assert.ok(
  /<iframe[\s>]/.test(sanitized),
  `sanitizer must preserve <iframe> tag. Got: ${sanitized.slice(0, 300)}`,
)
// host div style with width/height preserved
assert.ok(/style="[^"]*width:1280px/.test(sanitized), "sanitizer preserves width on wrapper")
assert.ok(/style="[^"]*height:720px/.test(sanitized), "sanitizer preserves height on wrapper")
// data-youtube-video marker preserved
assert.ok(/data-youtube-video/.test(sanitized), "sanitizer preserves data-youtube-video attr")
// YouTube src preserved (nocookie)
assert.ok(
  /src="https:\/\/www\.youtube-nocookie\.com\/embed\/dQw4w9WgXcQ/.test(sanitized),
  "sanitizer preserves youtube-nocookie embed src",
)
// allow preserved
assert.ok(
  sanitized.includes('allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"'),
  "sanitizer preserves allow attr on iframe",
)

// --- 2. SeoYoutube extension has width/height attrs and writes style on host ---
const ytExt = read("components/admin/editor/youtube-extension.ts")
assert.ok(ytExt.includes('width: {'), "youtube extension declares width attr")
assert.ok(ytExt.includes('height: {'), "youtube extension declares height attr")
assert.ok(
  ytExt.includes('data-youtube-video'),
  "youtube extension renderHTML writes data-youtube-video host",
)
assert.ok(
  ytExt.includes('style: mediaStyle(coerceMediaDimension(width)'),
  "youtube extension renderHTML uses mediaStyle(width,height) on host",
)

// --- 3. UploadedVideo extension has width/height attrs ---
const vExt = read("components/admin/editor/video-extension.ts")
assert.ok(vExt.includes('width: {'), "video extension declares width attr")
assert.ok(vExt.includes('height: {'), "video extension declares height attr")

// --- 4. MediaControls component exposes height field + YouTube presets ---
const mc = read("components/admin/editor/media-controls.tsx")
assert.ok(mc.includes("hasHeight"), "MediaControls accepts hasHeight opt")
assert.ok(mc.includes("hasYoutubePresets"), "MediaControls accepts hasYoutubePresets opt")
assert.ok(mc.includes("onHeight"), "MediaControls accepts onHeight callback")
assert.ok(mc.includes("480p") && mc.includes("720p") && mc.includes("HD") && mc.includes("FHD"),
  "MediaControls renders YouTube preset buttons (480p/720p/HD/FHD)")
assert.ok(mc.includes("placeholder=\"Высота, px\""), "MediaControls height input placeholder")
assert.ok(mc.includes("16:9"), "MediaControls shows aspect-ratio lock button 16:9")
assert.ok(mc.includes("Lock") && mc.includes("Unlock"), "MediaControls uses lock/unlock icons for ratio")

// --- 5. MediaNodeView wires height for youtube/video/image + hasYoutubePresets=youtube only ---
const nv = read("components/admin/editor/media-node-views.tsx")
assert.ok(nv.includes('hasHeight={mediaName === "youtube"'),
  "MediaNodeView enables height controls for youtube | video | image")
assert.ok(nv.includes('hasYoutubePresets={mediaName === "youtube"}'),
  "MediaNodeView enables YouTube size presets only for youtube type")
assert.ok(nv.includes('onHeight={'),
  "MediaNodeView wires onHeight into MediaControls")

// --- 6. media-helpers exposes normalizeMediaHeight + parseMediaHeight ---
const mh = read("components/admin/editor/media-helpers.ts")
assert.ok(mh.includes("normalizeMediaHeight"), "media-helpers exports normalizeMediaHeight")
assert.ok(mh.includes("parseMediaHeight"), "media-helpers exports parseMediaHeight")
// Only px allowed for height (no %)
assert.equal(normalizeMediaWidth("50%"), "50%", "width allows % units")
assert.equal(normalizeMediaHeight("50%"), null, "height rejects % units (only px)")
assert.equal(normalizeMediaHeight("360px"), "360px", "height accepts px units")
assert.equal(normalizeMediaHeight("abc"), null, "height rejects garbage")
assert.equal(normalizeMediaHeight("-10px"), null, "height rejects negative")

// --- 7. globals.css has responsive YouTube CSS + aspect-ratio 16/9 ---
const gc = read("app/globals.css")
assert.ok(gc.includes("[data-youtube-video]"), "globals.css targets data-youtube-video host")
assert.ok(/aspect-ratio:\s*16\s*\/\s*9/.test(gc), "globals.css sets aspect-ratio 16/9 for YouTube host/iframe")

// --- 8. sanitizer ALLOWED_TAGS includes iframe + allowfullscreen/frameborder attrs ---
const sh = read("lib/sanitize-html.ts")
assert.ok(sh.includes('"iframe",') || sh.includes("  \"iframe\","),
  "sanitize-html ALLOWED_TAGS includes iframe tag (was dropped before fix)")
assert.ok(sh.includes('"allow"'), "sanitizer allows allow attr on iframe")
assert.ok(sh.includes('"allowfullscreen"'), "sanitizer allows allowfullscreen attr on iframe")
assert.ok(sh.includes('"frameborder"'), "sanitizer allows frameborder attr on iframe")
assert.ok(sh.includes('"data-youtube-video"'), "sanitizer allows data-youtube-video data attr")

console.log("youtube-size-roundtrip.selfcheck: ok")
