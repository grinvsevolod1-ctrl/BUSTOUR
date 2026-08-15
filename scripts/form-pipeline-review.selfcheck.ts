/**
 * #59/#63/#56/#57/#58: public review pipeline — pending create, simplified form,
 * moderation note, consent+required captcha, media upload path.
 * Run: npx tsx scripts/form-pipeline-review.selfcheck.ts
 */
import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import {import { hasSelfcheckPostgres, skipRuntimeMessage } from "./lib/selfcheck-db"

  DEFAULT_REVIEW_LIST_FILTERS,
  filterAndSortReviews,
} from "../lib/review-admin"

const root = path.join(import.meta.dirname, "..")

const modal = fs.readFileSync(
  path.join(root, "components/site/modals/modal-testimonial.tsx"),
  "utf8",
)
assert.match(modal, /submitPublicReview/)
assert.ok(!modal.includes("submitLead"), "modal must not stub as lead")
assert.ok(!modal.includes("Страна отдыха"), "no country field (#63)")
assert.ok(!modal.includes("Дата поездки"), "no trip date (#63)")
assert.ok(!modal.includes("E-mail"), "no email field (#63)")
assert.match(modal, /type="checkbox"/)
assert.match(modal, /после проверки модератором/i)
assert.match(modal, /captchaRequiredClientError/)
assert.match(modal, /Прикрепить фото или видео/)
assert.match(modal, /\bfile\b/)
assert.match(modal, /обязательные поля/)
assert.match(modal, /RatingStars|radiogroup/)
assert.match(modal, /rating/)

const route = fs.readFileSync(path.join(root, "app/api/review/route.ts"), "utf8")
assert.match(route, /createReview/)
assert.match(route, /approved:\s*false/)
assert.match(route, /required:\s*true/)
assert.match(route, /mediaService\.saveFile/)
assert.match(route, /formData/)
assert.match(route, /consent/)
assert.ok(!route.includes("Тел: ${phone}"), "must not leak phone into review text (#95)")
assert.match(route, /encodeReviewPhoneSourceId/)

const client = fs.readFileSync(path.join(root, "lib/public-review.ts"), "utf8")
assert.match(client, /\/api\/review/)
assert.match(client, /FormData/)

const card = fs.readFileSync(path.join(root, "components/admin/review-card.tsx"), "utf8")
assert.match(card, /thumbnailUrl/)

const captchaPub = fs.readFileSync(path.join(root, "lib/recaptcha-public.ts"), "utf8")
assert.match(captchaPub, /captchaRequiredClientError/)

const captchaSrv = fs.readFileSync(path.join(root, "lib/recaptcha.ts"), "utf8")
assert.match(captchaSrv, /required\?:\s*boolean/)
assert.match(captchaSrv, /getCaptchaWiringStatus/)

async function main() {
  const dbFile = path.join(os.tmpdir(), `bustour-form-pipeline-${Date.now()}.db`)

  const { ensureDb } = await import("../lib/db/init")
  const { createReview, getReviews, purgeReview } = await import("../lib/queries")
  await ensureDb()

  const stamp = `selfcheck-59-${Date.now()}`
  let id = 0
  let videoId = 0
  try {
    await createReview({
      type: "TEXT",
      name: stamp,
      tour: "",
      text: "Отличный отдых",
      rating: 5,
      source: "manual",
      sourceDate: "",
      approved: false,
      thumbnailUrl: "/uploads/selfcheck-photo.jpg",
    })
    const all = await getReviews()
    const created = all.find((r) => r.name === stamp)
    assert.ok(created, "site review missing from getReviews()")
    id = created.id
    assert.equal(created.approved, false)
    assert.equal(created.thumbnailUrl, "/uploads/selfcheck-photo.jpg")
    assert.ok(!/Тел:/i.test(created.text), "review text must not embed phone")

    const pending = filterAndSortReviews(all, {
      ...DEFAULT_REVIEW_LIST_FILTERS,
      status: "pending",
    })
    assert.ok(
      pending.some((r) => r.id === created.id),
      "site review must appear in admin pending filter",
    )

    const videoStamp = `selfcheck-59-video-${Date.now()}`
    await createReview({
      type: "VIDEO",
      name: videoStamp,
      tour: "",
      text: "Видеоотзыв",
      rating: 5,
      source: "manual",
      approved: false,
      videoUrl: "/uploads/selfcheck-clip.mp4",
      thumbnailUrl: "",
    })
    const afterVideo = await getReviews()
    const video = afterVideo.find((r) => r.name === videoStamp)
    assert.ok(video, "video review missing")
    videoId = video.id
    assert.equal(video.approved, false)
    assert.equal(video.videoUrl, "/uploads/selfcheck-clip.mp4")
  } finally {
    if (id) await purgeReview(id)
    if (videoId) await purgeReview(videoId)
    try {
      fs.unlinkSync(dbFile)
    } catch {
      /* ignore */
    }
  }

  console.log("form-pipeline-review.selfcheck: ok")
}

if (!hasSelfcheckPostgres()) {
  console.log(skipRuntimeMessage("form-pipeline-review.selfcheck.ts"))
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
