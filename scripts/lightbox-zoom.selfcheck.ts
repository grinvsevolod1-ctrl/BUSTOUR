import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const root = process.cwd()
const lightbox = readFileSync(join(root, "components/site/image-lightbox.tsx"), "utf8")
const gallery = readFileSync(join(root, "components/site/tour-gallery.tsx"), "utf8")

assert.match(lightbox, /export function ZoomableLightboxImage/, "shared zoomable lightbox image exists")
assert.match(lightbox, /max-md:w-full/, "mobile image expands to viewport width")
assert.match(lightbox, /md:max-w-\[80vw\]/, "desktop image width capped")
assert.match(lightbox, /max-h-\[85dvh\]/, "image height capped")
assert.match(lightbox, /onWheel/, "wheel zoom supported")
assert.match(lightbox, /onPointerDown/, "drag pan supported")
assert.match(lightbox, /onDoubleClick/, "double click resets zoom")
assert.match(lightbox, /onTouchStart/, "touch pinch starts")
assert.match(lightbox, /onTouchMove/, "touch pinch moves")
assert.match(lightbox, /preventDefault\(\)/, "native scroll blocked during zoom gestures")
assert.match(lightbox, /MAX_ZOOM\s*=\s*4/, "zoom upper bound is 4x")
assert.match(lightbox, /MIN_ZOOM\s*=\s*1/, "zoom lower bound returns to 1x")
assert.match(lightbox, /onZoomChange\?\.\(scale > MIN_ZOOM\)/, "zoom state is exposed to modal container")
assert.match(lightbox, /zoomed \? "p-0" : "overflow-hidden p-3 sm:p-4"/, "image lightbox removes modal padding while zoomed")
assert.match(lightbox, /h-full w-full max-w-none max-h-none p-0/, "image lightbox uses full viewport canvas while zoomed")
assert.match(lightbox, /h-auto w-full max-w-none max-h-none/, "zoomed image removes intrinsic max-width box")
assert.match(lightbox, /scale\(\$\{scale\}\) translate/, "zoom transform uses scale layer before pan")
assert.match(lightbox, /className="fixed right-3 .* z-50/, "image lightbox close button stays fixed above zoomed image")
assert.match(gallery, /ZoomableLightboxImage/, "tour gallery uses shared zoomable image")
assert.match(gallery, /zoomed \? "p-0" : "overflow-hidden p-3 sm:p-4"/, "tour lightbox removes modal padding while zoomed")
assert.match(gallery, /relative h-full w-full max-w-none max-h-none p-0/, "tour lightbox uses full viewport canvas while zoomed")
assert.match(gallery, /className="fixed left-1 .* z-50/, "previous button stays fixed above zoomed image")
assert.match(gallery, /className="fixed right-1 .* z-50/, "next button stays fixed above zoomed image")

console.log("lightbox-zoom.selfcheck: ok")
