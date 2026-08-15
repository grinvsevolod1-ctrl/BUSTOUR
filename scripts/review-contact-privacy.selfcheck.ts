/**
 * #95 — review author phone must not appear on public cards; stored AES-GCM.
 * Run: npx tsx scripts/review-contact-privacy.selfcheck.ts
 */
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import {
  encodeReviewPhoneSourceId,
  decodeReviewPhoneSourceId,
  resolveAdminReviewPhone,
} from "../lib/review-phone"
import { reviewPlainText, stripPublicReviewText, toPublicReview } from "../lib/review-utils"
import type { Review } from "../lib/types"

const root = path.join(import.meta.dirname, "..")

const route = fs.readFileSync(path.join(root, "app/api/review/route.ts"), "utf8")
assert.ok(!route.includes("Тел: ${phone}"), "API must not append phone to review text")
assert.ok(route.includes("encodeReviewPhoneSourceId"), "API must encrypt phone into sourceId")
assert.ok(route.includes("notifyLead"), "staff notify still gets plaintext phone once")

const queries = fs.readFileSync(path.join(root, "lib/queries.ts"), "utf8")
assert.ok(queries.includes("toPublicReview"), "public review queries must sanitize")

const phone = "+375 (29) 111-22-33"
const sourceId = encodeReviewPhoneSourceId(phone)
assert.ok(sourceId.startsWith("encphone:"), "sourceId prefix")
assert.notEqual(sourceId, `encphone:${phone}`, "must not store plaintext phone")
assert.equal(decodeReviewPhoneSourceId(sourceId), phone)

const leaked = "Отличный тур!\n\nТел: +375 (29) 111-22-33"
assert.equal(stripPublicReviewText(leaked), "Отличный тур!")
assert.equal(reviewPlainText("<p>Hi</p><script>alert(1)</script>"), "Hi")
assert.equal(resolveAdminReviewPhone({ sourceId: "", text: leaked }), "+375 (29) 111-22-33")
assert.equal(resolveAdminReviewPhone({ sourceId, text: "ok" }), phone)

const base: Review = {
  id: 1,
  type: "TEXT",
  name: "A",
  tour: "",
  text: leaked,
  rating: 5,
  source: "manual",
  sourceId,
  sourceDate: "",
  approved: true,
  showOn: [],
  videoUrl: "",
  thumbnailUrl: "",
  archived: false,
  createdAt: Date.now(),
}

const pub = toPublicReview(base)
assert.equal(pub.sourceId, "")
assert.equal(pub.text, "Отличный тур!")
assert.doesNotMatch(pub.text, /Тел/)
assert.equal(reviewPlainText("<script>alert('xss')</script>safe"), "safe")

console.log("review-contact-privacy.selfcheck: ok")
