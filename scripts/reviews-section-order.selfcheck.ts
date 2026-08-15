/**
 * #54: /testimonials honors FAQ/callus section order; dual reviews|testimonials keys.
 * Run: npx tsx scripts/reviews-section-order.selfcheck.ts
 */
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import {
  REVIEWS_PAGE_CMS_KEY,
  REVIEWS_PAGE_DEFAULT_SECTION_ORDER,
  REVIEWS_PAGE_LEGACY_CMS_KEY,
  resolveReviewsPageCmsPrefix,
  resolveReviewsPageSectionOrder,
} from "../lib/reviews-page-cms"

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const read = (rel: string) => fs.readFileSync(path.join(root, rel), "utf8")

assert.deepEqual(
  resolveReviewsPageSectionOrder({}),
  [...REVIEWS_PAGE_DEFAULT_SECTION_ORDER],
  "default: faq then callus (matches admin)",
)

assert.deepEqual(
  resolveReviewsPageSectionOrder({
    [`${REVIEWS_PAGE_CMS_KEY}.sections.order`]: JSON.stringify(["callus", "faq"]),
  }),
  ["callus", "faq"],
  "canonical reviews.sections.order wins",
)

assert.deepEqual(
  resolveReviewsPageSectionOrder({
    [`${REVIEWS_PAGE_LEGACY_CMS_KEY}.sections.order`]: JSON.stringify(["callus", "faq"]),
  }),
  ["callus", "faq"],
  "legacy testimonials.sections.order used when reviews missing",
)

assert.deepEqual(
  resolveReviewsPageSectionOrder({
    [`${REVIEWS_PAGE_CMS_KEY}.sections.order`]: JSON.stringify(["faq", "callus"]),
    [`${REVIEWS_PAGE_LEGACY_CMS_KEY}.sections.order`]: JSON.stringify(["callus", "faq"]),
  }),
  ["faq", "callus"],
  "reviews wins over testimonials when both set",
)

assert.equal(resolveReviewsPageCmsPrefix({}), REVIEWS_PAGE_CMS_KEY)
assert.equal(
  resolveReviewsPageCmsPrefix({
    [`${REVIEWS_PAGE_LEGACY_CMS_KEY}.sections.order`]: "[]",
  }),
  REVIEWS_PAGE_LEGACY_CMS_KEY,
)

const page = read("app/(site)/testimonials/page.tsx")
assert.ok(page.includes("OrderedCallUs"), "public: OrderedCallUs in section order")
assert.ok(page.includes("OrderedFaqSection"), "public: OrderedFaqSection in section order")
assert.ok(page.includes("resolveReviewsPageSectionOrder"), "public: dual-key order resolver")
assert.ok(!page.includes("PageExtras"), "public: no PageExtras dump (order ignored)")

const admin = read("app/admin/(protected)/reviews/page.tsx")
assert.ok(admin.includes("REVIEWS_PAGE_LEGACY_CMS_KEY"), "admin: reads legacy order/FAQ")
assert.ok(admin.includes("REVIEWS_PAGE_DEFAULT_SECTION_ORDER"), "admin: shared default order")

const cms = read("app/admin/cms-actions.ts")
assert.ok(cms.includes('revalidatePath("/testimonials")'), "revalidate /testimonials on CMS save")

const slug = read("app/admin/(protected)/pages/[slug]/page.tsx")
assert.ok(
  slug.includes('slug === "testimonials"') && slug.includes("redirect"),
  "admin pages/testimonials redirects to /admin/reviews",
)

const modals = read("scripts/site-modals.selfcheck.ts")
assert.ok(modals.includes("ModalTestimonial"), "site-modals still covers testimonials")

console.log("reviews-section-order.selfcheck: ok")
