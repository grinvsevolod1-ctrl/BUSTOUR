/**
 * Review admin: tour badge lock, multi-photo storage, edit redirect to list.
 * Run: npx tsx scripts/review-tour-photos.selfcheck.ts
 */
import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import {import { hasSelfcheckPostgres, skipRuntimeMessage } from "./lib/selfcheck-db"

  parseReviewPhotoUrls,
  reviewHasLinkedTour,
  serializeReviewPhotoUrls,
} from "../lib/review-admin"

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const read = (rel: string) => fs.readFileSync(path.join(root, rel), "utf8")

const card = read("components/admin/review-card.tsx")
assert.match(card, /Тур!/)
assert.match(card, /reviewHasLinkedTour/)
assert.match(card, /tourLocked|Страница тура/)
assert.match(card, /автобусному туру/)

const form = read("components/admin/review-form.tsx")
assert.match(form, /mode="multiple"/)
assert.match(form, /serializeReviewPhotoUrls|parseReviewPhotoUrls/)
assert.match(form, /admin\/reviews#reviews-list/)
assert.match(form, /автобусн/i)

const actions = read("app/admin/actions.ts")
assert.match(actions, /#reviews-list/)
assert.match(actions, /thumbnailUrl: data\.thumbnailUrl/)
assert.doesNotMatch(actions, /thumbnailUrl: data\.type === "VIDEO" \? data\.thumbnailUrl : ""/)

const listPage = read("app/admin/(protected)/reviews/page.tsx")
assert.match(listPage, /getBusTours/)
assert.doesNotMatch(listPage, /getTours\(\)/)

const editPage = read("app/admin/(protected)/reviews/[id]/page.tsx")
assert.match(editPage, /getBusTours/)

const publicSec = read("components/site/reviews-section.tsx")
assert.match(publicSec, /parseReviewPhotoUrls/)

assert.equal(reviewHasLinkedTour({ tour: "Карелия" }), true)
assert.equal(serializeReviewPhotoUrls(["/1.jpg", "/2.jpg"]), '["/1.jpg","/2.jpg"]')
assert.deepEqual(parseReviewPhotoUrls('["/1.jpg","/2.jpg"]'), ["/1.jpg", "/2.jpg"])

async function main() {
  const dbFile = path.join(os.tmpdir(), `bustour-review-tour-${Date.now()}.db`)
  const { ensureDb } = await import("../lib/db/init")
  const { createReview, getReviewById, updateReview, setReviewShowOn } = await import("../lib/queries")
  await ensureDb()

  await createReview({
    type: "TEXT",
    name: "Photo multi",
    tour: "Bus Tour A",
    text: "hi",
    rating: 5,
    approved: true,
    showOn: ["home", "tour"],
    thumbnailUrl: serializeReviewPhotoUrls(["/u/a.jpg", "/u/b.jpg"]),
  })
  const { getReviews } = await import("../lib/queries")
  const created = (await getReviews()).find((r) => r.name === "Photo multi")
  assert.ok(created)
  assert.equal(created!.approved, true)
  assert.deepEqual(created!.showOn, ["home", "tour"])
  assert.deepEqual(parseReviewPhotoUrls(created!.thumbnailUrl), ["/u/a.jpg", "/u/b.jpg"])

  await updateReview(created!.id, {
    type: "TEXT",
    name: "Photo multi",
    tour: "",
    text: "hi2",
    rating: 4,
    thumbnailUrl: "/u/only.jpg",
  })
  const after = await getReviewById(created!.id)
  assert.ok(after)
  assert.equal(after!.approved, true, "update must not wipe approved")
  assert.deepEqual(after!.showOn, ["home", "tour"], "update must not wipe showOn")
  assert.equal(after!.tour, "")
  assert.equal(after!.thumbnailUrl, "/u/only.jpg")

  // server guard path: strip tour key when no linked tour (mirror action)
  let showOn = ["home", "tour"]
  if (showOn.includes("tour") && !after!.tour.trim()) {
    showOn = showOn.filter((k) => k !== "tour")
  }
  await setReviewShowOn(created!.id, showOn)
  assert.deepEqual((await getReviewById(created!.id))!.showOn, ["home"])

  try {
    fs.unlinkSync(dbFile)
  } catch {
    /* ignore */
  }
  console.log("review-tour-photos.selfcheck: ok")
}

if (!hasSelfcheckPostgres()) {
  console.log(skipRuntimeMessage("review-tour-photos.selfcheck.ts"))
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
