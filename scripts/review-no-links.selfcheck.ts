/**
 * #111: public reviews strip links in name/text (admin/Holiday untouched).
 * Run: npx tsx scripts/review-no-links.selfcheck.ts
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { reviewFieldHasLink, stripReviewLinks } from "@/lib/review-utils"

assert.equal(reviewFieldHasLink("Отличный тур"), false)
assert.equal(reviewFieldHasLink("https://spam.example/x"), true)
assert.equal(stripReviewLinks("Отлично https://spam.example/x спасибо"), "Отлично спасибо")
assert.equal(stripReviewLinks("см. www.bad.ru сегодня"), "см. сегодня")
assert.equal(stripReviewLinks("пишите t.me/spam"), "пишите")
assert.equal(stripReviewLinks("сайт site.com ок"), "сайт ок")
assert.equal(stripReviewLinks("оценка 4.5 из 5"), "оценка 4.5 из 5")
assert.equal(stripReviewLinks("https://only.link"), "")

const api = readFileSync(join(process.cwd(), "app/api/review/route.ts"), "utf8")
assert.match(api, /stripReviewLinks/)
assert.doesNotMatch(api, /REVIEW_NO_LINKS_MESSAGE/)

const modal = readFileSync(join(process.cwd(), "components/site/modals/modal-testimonial.tsx"), "utf8")
assert.match(modal, /stripReviewLinks/)

const admin = readFileSync(join(process.cwd(), "app/admin/actions.ts"), "utf8")
const save = admin.slice(admin.indexOf("export async function saveReviewAction"))
assert.doesNotMatch(save.slice(0, 800), /stripReviewLinks|reviewFieldHasLink/, "admin save not stripped")

console.log("review-no-links.selfcheck: ok")
