/**
 * TEXT+VIDEO public cards: equal height, row-aware clamp, modal/inline read-more.
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { reviewHasMedia, isVideoReview } from "../lib/review-admin"
import { reviewPlainText, reviewAvatarTone } from "../lib/review-utils"
import type { Review } from "../lib/types"

const root = process.cwd()
const section = readFileSync(join(root, "components/site/reviews-section.tsx"), "utf8")
const card = readFileSync(join(root, "components/site/review-card-public.tsx"), "utf8")

assert.match(card, /flex h-full min-w-0 flex-col/, "card is flex-col h-full")
assert.match(card, /flex-1/, "text area grows")
assert.match(card, /mt-auto/, "media/footer pinned bottom")
assert.match(card, /line-clamp-4/, "SSR default 4-line clamp")
assert.match(card, /syncReviewRowClamps/, "row sync adjusts clamp")
assert.match(card, /data-review-text-slot/, "text slot for measure")
assert.match(section, /useReviewRowClamp/, "grid runs row clamp hook")
assert.match(card, /matchMedia\(MD_UP\)/, "desktop modal via matchMedia")
assert.match(card, /setExpanded\(true\)/, "mobile inline expand")
assert.match(card, /Свернуть/, "collapse after inline expand")
assert.match(card, /max-w-xl md:max-w-2xl/, "modal reading width")
assert.match(card, /reviewPlainText/, "plain-text body")
assert.match(card, /reviewAvatarTone/, "pastel avatars")
assert.match(card, /ReviewVideoPlayer|isVideoReview/, "VIDEO in shared card")
assert.match(section, /items-stretch/, "grid equal-height stretch")
assert.match(section, /ReviewCardPublic/, "unified card")
assert.doesNotMatch(section, /VideoCard/, "testimonials grid no separate VideoCard")
assert.match(section, /ReviewFullTextModal/, "section opens full-text modal")
assert.match(card, /itemType="https:\/\/schema\.org\/Review"/, "Review microdata")

const base: Review = {
  id: 1,
  type: "TEXT",
  name: "A",
  tour: "",
  text: "ok",
  rating: 5,
  source: "manual",
  sourceId: "",
  sourceDate: "",
  approved: true,
  showOn: [],
  videoUrl: "",
  thumbnailUrl: "",
  archived: false,
  createdAt: Date.now(),
}

assert.equal(reviewHasMedia(base), false)
assert.equal(reviewHasMedia({ ...base, thumbnailUrl: "/uploads/a.webp" }), true)
assert.equal(reviewHasMedia({ ...base, type: "VIDEO", videoUrl: "https://youtu.be/abcdefghijk" }), true)
assert.ok(isVideoReview({ ...base, type: "VIDEO", videoUrl: "x" }))

assert.equal(reviewPlainText('<script>alert(1)</script>Hi'), "Hi")
assert.equal(reviewPlainText("<b>Bold</b> &amp; plain"), "Bold & plain")
assert.equal(reviewPlainText("Nice\n\nТел: +375 (29) 111-22-33"), "Nice")
assert.match(reviewAvatarTone("Анна"), /bg-\w+-100/)

console.log("review-cards.selfcheck: ok")
