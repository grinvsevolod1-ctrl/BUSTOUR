/**
 * #52 intro full content width; #53 titles/admin uncapped;
 * public TEXT cards clamp + modal full text (no Holiday.by CTA on /testimonials).
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const root = process.cwd()
const testimonials = readFileSync(join(root, "app/(site)/testimonials/page.tsx"), "utf8")
const staff = readFileSync(join(root, "app/(site)/company/staff/page.tsx"), "utf8")
const reviewsSection = readFileSync(join(root, "components/site/reviews-section.tsx"), "utf8")
const reviewCardPublic = readFileSync(join(root, "components/site/review-card-public.tsx"), "utf8")
const homeTestimonials = readFileSync(join(root, "components/site/testimonials.tsx"), "utf8")
const reviewCard = readFileSync(join(root, "components/admin/review-card.tsx"), "utf8")
const titleUnderline = readFileSync(join(root, "components/site/title-underline.tsx"), "utf8")

assert.doesNotMatch(
  testimonials,
  /pageIntro[\s\S]{0,200}max-w-3xl|max-w-3xl[\s\S]{0,80}pageIntro|className="max-w-3xl/,
  "#52: testimonials intro must not be max-w-3xl capped",
)
assert.match(
  testimonials,
  /className="w-full text-base leading-relaxed text-ink/,
  "#52: testimonials intro uses full content width",
)
assert.doesNotMatch(testimonials, /holiday\.by/i, "no holiday.by CTA on /testimonials")
assert.doesNotMatch(homeTestimonials, /holiday\.by/i, "no holiday.by on homepage block")
assert.match(homeTestimonials, /href="\/testimonials"/, "home CTA links to /testimonials")
assert.match(homeTestimonials, /AllReviewsCta|Все отзывы/, "home all-reviews CTA")
assert.doesNotMatch(staff, /staff\.intro[\s\S]{0,120}max-w-2xl|className="max-w-2xl/, "#52 audit: staff intro uncapped")

assert.match(reviewCardPublic, /line-clamp-4/, "public TEXT cards clamp")
assert.match(reviewCardPublic, /Читать полностью/, "read-more on public cards")
assert.match(reviewsSection, /ReviewFullTextModal/, "full text modal")
assert.match(reviewsSection, /items-stretch/, "equal height stretch")
assert.doesNotMatch(reviewsSection, /expandedId/, "no accordion id state")
assert.match(reviewCardPublic, /setExpanded/, "mobile inline expand")
assert.match(reviewCardPublic, /matchMedia/, "desktop modal breakpoint")
assert.doesNotMatch(reviewCard, /line-clamp-/, "#53: admin review cards must not line-clamp text")
assert.match(reviewCard, /break-words text-sm leading-relaxed text-admin-fg/, "#53: admin review text wraps fully")
assert.match(titleUnderline, /break-words/, "#53: page titles wrap instead of truncating")

console.log("reviews-layout.selfcheck: ok")
