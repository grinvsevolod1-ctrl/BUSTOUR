/**
 * Row-aware review clamp policy.
 * Run: npx tsx scripts/review-row-clamp.selfcheck.ts
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import {
  REVIEW_CLAMP_BASE_LINES,
  resolveLineHeightPx,
  reviewClampLines,
} from "../lib/review-row-clamp"

assert.equal(REVIEW_CLAMP_BASE_LINES, 4)

assert.equal(
  reviewClampLines({ expanded: true, rowHasMedia: true, slotHeightPx: 200, lineHeightPx: 26 }),
  null,
)

assert.equal(
  reviewClampLines({ expanded: false, rowHasMedia: false, slotHeightPx: 999, lineHeightPx: 26 }),
  4,
  "all text-only row → max 4 even if slot is huge",
)

assert.equal(
  reviewClampLines({ expanded: false, rowHasMedia: true, slotHeightPx: 26 * 10, lineHeightPx: 26 }),
  10,
  "next to media → fill slot",
)

assert.equal(
  reviewClampLines({ expanded: false, rowHasMedia: true, slotHeightPx: 26 * 2, lineHeightPx: 26 }),
  4,
  "floor never below base 4",
)

assert.equal(resolveLineHeightPx("26px", 16), 26)
assert.equal(resolveLineHeightPx("1.625", 16), 26)
assert.ok(resolveLineHeightPx("normal", 16) > 16)

const card = readFileSync(join(process.cwd(), "components/site/review-card-public.tsx"), "utf8")
const section = readFileSync(join(process.cwd(), "components/site/reviews-section.tsx"), "utf8")
assert.match(card, /data-review-card/)
assert.match(card, /syncReviewRowClamps/)
assert.match(section, /useReviewRowClamp/)

console.log("review-row-clamp.selfcheck: ok")
