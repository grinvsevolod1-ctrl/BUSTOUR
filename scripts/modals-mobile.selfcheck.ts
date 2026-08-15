/**
 * Public modals must fit average phone (bottom-sheet + scroll, not spring overshoot).
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const root = process.cwd()
const shell = readFileSync(join(root, "components/site/modals/site-modal-shell.tsx"), "utf8")
const callback = readFileSync(join(root, "components/site/callback-modal.tsx"), "utf8")
const presets = readFileSync(join(root, "components/site/motion-presets.ts"), "utf8")
const lightbox = readFileSync(join(root, "components/site/image-lightbox.tsx"), "utf8")
const gallery = readFileSync(join(root, "components/site/tour-gallery.tsx"), "utf8")

assert.match(shell, /min-h-0/, "shell dialog can shrink in flex overlay")
assert.match(shell, /100dvh/, "shell max-h uses dvh")
assert.match(shell, /overflow-hidden/, "overlay clips overflow")
assert.match(shell, /safe-area-inset-bottom/, "safe area padding")
assert.doesNotMatch(shell, /max-h-\[min\(100dvh/, "old nested min\(\) max-h removed")

assert.match(callback, /min-h-0/, "callback dialog shrinks")
assert.match(callback, /100dvh/, "callback max-h uses dvh")
assert.match(callback, /overflow-hidden p-3/, "callback overlay clips")

assert.match(presets, /duration: 0\.25/, "panel uses short tween")
assert.doesNotMatch(presets, /modalPanelTransition = \{ type: "spring"/, "no spring panel (overshoot on phones)")

assert.match(lightbox, /85dvh|min\(85dvh/, "lightbox uses dvh")
assert.match(lightbox, /safe-area-inset/, "lightbox safe area")
assert.doesNotMatch(lightbox, /mx-8/, "lightbox no large side margin on mobile")

assert.match(gallery, /mx-12.*sm:mx-16|mx-12 w-full/, "gallery tighter margins on mobile")
assert.match(gallery, /70dvh|maxHeight|max-h-\[70vh\]/, "gallery caps height on short phones")

console.log("modals-mobile.selfcheck: ok")
