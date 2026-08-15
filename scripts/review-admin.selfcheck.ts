import assert from "node:assert/strict"
import type { Review } from "@/lib/types"
import {
  REVIEW_SHOW_ON_OPTIONS,
  filterAndSortReviews,
  isVideoReview,
  formatReviewDisplayDate,
  parseReviewPhotoUrls,
  reviewHasLinkedTour,
  reviewShowsOn,
  sanitizeReviewShowOn,
  serializeReviewPhotoUrls,
  type ReviewListFilters,
} from "@/lib/review-admin"

const base: Review = {
  id: 1,
  type: "TEXT",
  name: "A",
  tour: "Тур",
  text: "ok",
  rating: 5,
  source: "manual",
  sourceId: "",
  sourceDate: "2025-01-02",
  approved: true,
  showOn: ["home"],
  videoUrl: "",
  thumbnailUrl: "",
  archived: false,
  createdAt: Date.parse("2025-01-02T00:00:00Z"),
}

const video: Review = {
  ...base,
  id: 2,
  type: "VIDEO",
  name: "V",
  approved: false,
  sourceDate: "2025-06-01",
  showOn: ["testimonials", "tour"],
  videoUrl: "/uploads/v.mp4",
  thumbnailUrl: "/uploads/t.jpg",
}

assert.equal(isVideoReview(video), true)
assert.equal(isVideoReview(base), false)
assert.equal(REVIEW_SHOW_ON_OPTIONS.length, 3)
assert.deepEqual(
  REVIEW_SHOW_ON_OPTIONS.map((o) => o.key),
  ["home", "testimonials", "tour"],
)

const filters: ReviewListFilters = {
  sort: "newest",
  status: "all",
  kind: "all",
  showOn: "all",
}

assert.deepEqual(
  filterAndSortReviews([base, video], filters).map((r) => r.id),
  [2, 1],
)
assert.deepEqual(
  filterAndSortReviews([base, video], { ...filters, sort: "oldest" }).map((r) => r.id),
  [1, 2],
)
assert.deepEqual(
  filterAndSortReviews([base, video], { ...filters, status: "pending" }).map((r) => r.id),
  [2],
)
assert.deepEqual(
  filterAndSortReviews([base, video], { ...filters, kind: "video" }).map((r) => r.id),
  [2],
)
assert.deepEqual(
  filterAndSortReviews([base, video], { ...filters, showOn: "home" }).map((r) => r.id),
  [1],
)
assert.deepEqual(
  filterAndSortReviews([base, video], { ...filters, showOn: "tour" }).map((r) => r.id),
  [2],
)

assert.equal(reviewShowsOn({ showOn: [] }, "home"), true)
assert.equal(reviewShowsOn({ showOn: ["home"] }, "testimonials"), false)
assert.equal(reviewShowsOn({ showOn: ["home", "tour"] }, "tour"), true)

assert.equal(formatReviewDisplayDate({ sourceDate: "", createdAt: base.createdAt }), new Date(base.createdAt).toLocaleDateString("ru-RU"))
assert.equal(formatReviewDisplayDate(base), new Date("2025-01-02T00:00:00").toLocaleDateString("ru-RU"))

assert.equal(reviewHasLinkedTour(base), true)
assert.equal(reviewHasLinkedTour({ ...base, tour: "  " }), false)
assert.deepEqual(parseReviewPhotoUrls("/a.jpg"), ["/a.jpg"])
assert.deepEqual(parseReviewPhotoUrls('["/a.jpg","/b.jpg"]'), ["/a.jpg", "/b.jpg"])
assert.equal(serializeReviewPhotoUrls(["/a.jpg", "/b.jpg"]), '["/a.jpg","/b.jpg"]')
assert.equal(serializeReviewPhotoUrls(["/a.jpg"]), "/a.jpg")
assert.deepEqual(sanitizeReviewShowOn(["home", "tour"], false), ["home"])

console.log("review-admin.selfcheck: ok")
