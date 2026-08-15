import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const review = readFileSync(join(process.cwd(), "lib/public-review.ts"), "utf8")
const analytics = readFileSync(join(process.cwd(), "lib/analytics.ts"), "utf8")
assert.match(review, /CustomEvent\(["']review_success["']/)
assert.match(review, /trackAnalyticsEvent\([\s\S]*["']review_success["']/)
assert.match(analytics, /dataLayer\.push/)
assert.match(review, /if \(res\.ok && data\.ok\)[\s\S]*emitReviewSuccess/)

console.log("review-success-event.selfcheck: ok")
