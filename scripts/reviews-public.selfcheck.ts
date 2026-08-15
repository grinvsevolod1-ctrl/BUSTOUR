import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import type { Review } from "@/lib/types"
import { formatReviewDisplayDate, reviewShowsOn } from "@/lib/review-admin"

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")

const testimonialsPage = fs.readFileSync(path.join(root, "app/(site)/testimonials/page.tsx"), "utf8")
assert.ok(
  testimonialsPage.includes('getApprovedReviews("testimonials")'),
  "/testimonials must filter by showOn key testimonials",
)
assert.match(
  testimonialsPage,
  /export const dynamic\s*=\s*["']force-dynamic["']/,
  "/testimonials must be force-dynamic (Docker build has no DB; static empty reviews)",
)

const actions = fs.readFileSync(path.join(root, "app/admin/actions.ts"), "utf8")
assert.ok(actions.includes("revalidateReviewsPublic"), "review mutations must share public revalidate helper")
assert.ok(
  /function revalidateReviewsPublic\(\)[\s\S]*?revalidatePath\("\/testimonials"\)/.test(actions),
  "revalidateReviewsPublic must revalidate /testimonials",
)

const section = fs.readFileSync(path.join(root, "components/site/reviews-section.tsx"), "utf8")
assert.ok(section.includes("ReviewCardPublic"), "reviews section uses ReviewCardPublic")

const card = fs.readFileSync(path.join(root, "components/site/review-card-public.tsx"), "utf8")
assert.ok(card.includes("formatReviewDisplayDate"), "public cards must use formatReviewDisplayDate")
assert.ok(card.includes("ImageLightbox"), "TEXT review photo uses ImageLightbox")
assert.ok(card.includes("parseReviewPhotoUrls"), "multi-photo parse on public cards")
assert.ok(
  /thumbnailUrl[\s\S]{0,400}ImageLightbox|parseReviewPhotoUrls/.test(card),
  "TEXT review cards must render attached photo (thumbnailUrl)",
)
assert.ok(card.includes("h-[60px]") && card.includes("w-[80px]"), "photo thumb ~80×60 as in Figma")
assert.ok(card.includes("group-hover:scale-"), "thumb hover zoom")

const adminForm = fs.readFileSync(path.join(root, "components/admin/review-form.tsx"), "utf8")
assert.ok(
  /type === "TEXT"[\s\S]*?MediaUploader[\s\S]*?mode="multiple"/.test(adminForm) ||
    /mode="multiple"[\s\S]*?label="Фото"/.test(adminForm),
  "admin TEXT review form must allow multiple photos",
)

const queries = fs.readFileSync(path.join(root, "lib/queries.ts"), "utf8")
assert.ok(
  queries.includes("input.sourceDate?.trim() || new Date().toISOString().slice(0, 10)"),
  "createReview must default sourceDate for manual reviews",
)

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
  createdAt: Date.parse("2026-07-20T12:00:00Z"),
}

assert.equal(reviewShowsOn(base, "testimonials"), true)
assert.equal(reviewShowsOn({ showOn: ["home"] }, "testimonials"), false)
assert.equal(reviewShowsOn({ showOn: ["testimonials"] }, "testimonials"), true)

assert.equal(formatReviewDisplayDate(base), new Date(base.createdAt).toLocaleDateString("ru-RU"))
assert.equal(
  formatReviewDisplayDate({ ...base, sourceDate: "2025-01-02" }),
  new Date("2025-01-02T00:00:00").toLocaleDateString("ru-RU"),
)
assert.equal(formatReviewDisplayDate({ ...base, sourceDate: "13 мая 2016" }), "13 мая 2016")

console.log("reviews-public.selfcheck: ok")
