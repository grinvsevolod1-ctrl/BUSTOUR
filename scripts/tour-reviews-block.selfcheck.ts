/**
 * Tour reviews: bus-only binding, title prop, mobile carousel, equal-height desktop.
 * Run: npx tsx scripts/tour-reviews-block.selfcheck.ts
 */
import assert from "node:assert/strict"
import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"

const root = process.cwd()
const tourPage = readFileSync(join(root, "components/site/tour-page-content.tsx"), "utf8")
const block = readFileSync(join(root, "components/site/tour-reviews-block.tsx"), "utf8")
const busRoute = readFileSync(
  join(root, "app/(site)/avtobusnye-tury/[countrySlug]/[citySlug]/[tourSlug]/page.tsx"),
  "utf8",
)

assert.match(tourPage, /TourReviewsBlock/, "tour page uses TourReviewsBlock")
assert.match(tourPage, /reviewsTitle\s*=\s*"Отзывы о туре"/, "default title prop")
assert.match(block, /title\s*=\s*"Отзывы о туре"/, "block default title")
// #108: prop title visible via TitleUnderline; not sr-only; parent must not also title reviews
assert.doesNotMatch(block, /className="sr-only"\s*>\{title\}/, "title must not be sr-only")
assert.match(block, /TitleUnderline/, "visible TitleUnderline for reviews title")
assert.match(
  tourPage,
  /reviews:[\s\S]*?node:\s*<TourReviewsBlock/,
  "reviews section node",
)
assert.doesNotMatch(
  tourPage,
  /reviews:[\s\S]*?title:\s*reviewsTitle/,
  "no duplicate parent title for reviews",
)
assert.match(block, /md:hidden/, "mobile carousel branch")
assert.match(block, /aria-roledescription="carousel"/, "carousel a11y")
assert.match(block, /md:grid/, "desktop grid")
assert.match(block, /ReviewCardPublic/, "shared public card")
assert.match(busRoute, /getReviewsByTour/, "bus tour fetches reviews")

const aviaDir = join(root, "app/(site)/aviatory")
for (const name of readdirSync(aviaDir, { recursive: true })) {
  const rel = String(name)
  if (!rel.endsWith(".tsx") && !rel.endsWith(".ts")) continue
  const src = readFileSync(join(aviaDir, rel), "utf8")
  assert.doesNotMatch(src, /getReviewsByTour/, `avia ${rel} must not bind reviews by tour`)
  assert.doesNotMatch(src, /TourReviewsBlock/, `avia ${rel} must not render tour reviews block`)
}

console.log("tour-reviews-block.selfcheck: ok")
