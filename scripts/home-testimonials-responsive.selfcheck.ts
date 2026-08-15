import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const source = readFileSync(join(process.cwd(), "components/site/testimonials.tsx"), "utf8")
const videoCard = readFileSync(join(process.cwd(), "components/site/video-card.tsx"), "utf8")

assert.match(source, /sm:grid-cols-2 lg:grid-cols-3/, "desktop/tablet responsive grid")
assert.match(source, /space-y-6 sm:hidden/, "mobile layout is separate from desktop grid")
assert.match(source, /const mobileReview = capped\[mobilePage\]/, "mobile renders one review")
assert.match(source, /aria-live="polite"/, "mobile pagination announces current page")
assert.match(source, /h-11 w-11/, "mobile pagination controls have 44px touch targets")
assert.match(source, /VideoCard/, "home uses shared VideoCard")
assert.match(videoCard, /aspect-\[2\/1\]/, "video cards match 448x224 reference ratio")

console.log("home-testimonials-responsive.selfcheck: ok")
