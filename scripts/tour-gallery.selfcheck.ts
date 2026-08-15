import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const root = process.cwd()
const gallery = readFileSync(join(root, "components/site/tour-gallery.tsx"), "utf8")
const css = readFileSync(join(root, "app/globals.css"), "utf8")

assert.ok(gallery.includes("outgoing"), "tracks outgoing slide for exit layer")
assert.ok(gallery.includes("onAnimationEnd"), "clears animation on end")
assert.ok(gallery.includes("min-h-[180px]"), "mobile min-height guard")
assert.ok(gallery.includes("shrink-0"), "mobile shrink-0 against flex collapse")
assert.ok(!/animating && \(\s*<div[^>]*>\s*\{\/\* previous/.test(gallery), "no empty exit shell")
assert.ok(css.includes("animate-slide-in-left"), "slide keyframes wired")
assert.ok(gallery.includes("isVideoUrl"), "video URL detection")
assert.ok(gallery.includes("<video"), "renders video player")

console.log("tour-gallery.selfcheck: ok")
