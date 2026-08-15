/**
 * Reviews tab coverage pack: site→pending→approve, showOn/tour lock,
 * edit preserves flags, holiday HTML parse, public API contract.
 * Run: npx tsx scripts/review-lifecycle.selfcheck.ts
 */
import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import {
  DEFAULT_REVIEW_LIST_FILTERS,
  filterAndSortReviews,
  parseReviewPhotoUrls,
  sanitizeReviewShowOn,
  serializeReviewPhotoUrls,
} from "../lib/review-admin"
import { holidaySourceId, parseHolidayReviewsHtml } from "../lib/holiday-reviews"
import { verifyRecaptchaToken } from "../lib/recaptcha"import { hasSelfcheckPostgres, skipRuntimeMessage } from "./lib/selfcheck-db"


const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const read = (rel: string) => fs.readFileSync(path.join(root, rel), "utf8")

const GREEN = "\x1b[32m"
const RESET = "\x1b[0m"
const ok = (msg: string) => console.log(`${GREEN}✓${RESET} ${msg}`)

async function step(label: string, fn: () => Promise<void> | void) {
  await fn()
  ok(label)
}

async function main() {
  await step("admin actions: approve + showOn + edit redirect", () => {
    const actions = read("app/admin/actions.ts")
    assert.match(actions, /approveReviewAction/)
    assert.match(actions, /review_approve/)
    assert.match(actions, /sanitizeReviewShowOn/)
    assert.match(actions, /#reviews-list/)
    assert.match(actions, /thumbnailUrl: data\.thumbnailUrl/)
  })

  await step("public POST /api/review: pending + captcha required", () => {
    const route = read("app/api/review/route.ts")
    assert.match(route, /approved:\s*false/)
    assert.match(route, /verifyRecaptchaToken/)
    assert.match(route, /required:\s*true/)
    assert.match(route, /encodeReviewPhoneSourceId/)
  })

  await step("holiday import: button + parse module", () => {
    const btn = read("components/admin/holiday-import-button.tsx")
    assert.match(btn, /\/api\/admin\/parse-holiday-reviews/)
    const route = read("app/api/admin/parse-holiday-reviews/route.ts")
    assert.match(route, /parseHolidayReviewsHtml/)
    assert.match(route, /source:\s*"holiday_by"/)
    assert.match(route, /approved:\s*false/)
  })

  await step("holiday HTML fixture parse + dedupe id", () => {
    const html = `
    <div class="comment-card">
      <div class="comment-card__name">Иван</div>
      <div class="date-comment-card">1 мая 2020</div>
      <div class="comment-card__content"><p>Отличный тур</p></div>
    </div>
    <div class="comment-card">
      <div class="comment-card__name">Иван</div>
      <div class="date-comment-card">1 мая 2020</div>
      <div class="comment-card__content"><p>Отличный тур</p></div>
    </div>
    <div class="comment-card">
      <div class="comment-card__name">Пётр</div>
      <div class="comment-card__content"><p></p></div>
    </div>
  `
    const rows = parseHolidayReviewsHtml(html)
    assert.equal(rows.length, 2)
    assert.equal(rows[0]!.name, "Иван")
    assert.equal(rows[0]!.text, "Отличный тур")
    assert.equal(rows[0]!.sourceId, holidaySourceId("Иван", "Отличный тур"))
    assert.equal(rows[0]!.sourceId, rows[1]!.sourceId)
  })

  await step("sanitizeReviewShowOn strips tour without link", () => {
    assert.deepEqual(sanitizeReviewShowOn(["home", "tour"], false), ["home"])
    assert.deepEqual(sanitizeReviewShowOn(["home", "tour"], true), ["home", "tour"])
  })

  await step("captcha skips when keys unset (free testing)", async () => {
    const prevSite = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY
    const prevSecret = process.env.RECAPTCHA_SECRET_KEY
    delete process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY
    delete process.env.RECAPTCHA_SECRET_KEY
    const res = await verifyRecaptchaToken("", { required: true })
    assert.equal(res.ok, true)
    if (prevSite !== undefined) process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY = prevSite
    else delete process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY
    if (prevSecret !== undefined) process.env.RECAPTCHA_SECRET_KEY = prevSecret
    else delete process.env.RECAPTCHA_SECRET_KEY
  })

  const dbFile = path.join(os.tmpdir(), `bustour-review-lifecycle-${Date.now()}.db`)
  const { ensureDb } = await import("../lib/db/init")
  const {
    createReview,
    getReviews,
    getReviewById,
    getApprovedReviews,
    approveReview,
    updateReview,
    setReviewShowOn,
    purgeReview,
  } = await import("../lib/queries")
  await ensureDb()

  const stamp = `lc-${Date.now()}`
  const ids: number[] = []

  try {
    await step("site-like create → pending in admin filters", async () => {
      await createReview({
        type: "TEXT",
        name: `${stamp}-site`,
        tour: "",
        text: "с сайта",
        rating: 5,
        source: "manual",
        sourceId: `enc-${stamp}`,
        approved: false,
        showOn: [],
        thumbnailUrl: "/uploads/site.jpg",
      })
      const all = await getReviews()
      const row = all.find((r) => r.name === `${stamp}-site`)
      assert.ok(row)
      ids.push(row!.id)
      assert.equal(row!.approved, false)
      const pending = filterAndSortReviews(all, {
        ...DEFAULT_REVIEW_LIST_FILTERS,
        status: "pending",
      })
      assert.ok(pending.some((r) => r.id === row!.id))
      assert.equal((await getApprovedReviews()).some((r) => r.id === row!.id), false)
    })

    await step("approve → public list", async () => {
      const id = ids[0]!
      await approveReview(id, true)
      const row = await getReviewById(id)
      assert.equal(row!.approved, true)
      assert.ok((await getApprovedReviews()).some((r) => r.id === id))
      await approveReview(id, false)
      assert.equal((await getReviewById(id))!.approved, false)
      await approveReview(id, true)
    })

    await step("showOn tour locked without tour; unlocked with tour", async () => {
      const id = ids[0]!
      await setReviewShowOn(id, sanitizeReviewShowOn(["home", "tour"], false))
      assert.deepEqual((await getReviewById(id))!.showOn, ["home"])

      await updateReview(id, {
        type: "TEXT",
        name: `${stamp}-site`,
        tour: "Автобусный тур Карелия",
        text: "с сайта",
        rating: 5,
        thumbnailUrl: "/uploads/site.jpg",
      })
      assert.equal((await getReviewById(id))!.approved, true, "edit must keep approved")
      assert.deepEqual((await getReviewById(id))!.showOn, ["home"])

      await setReviewShowOn(id, sanitizeReviewShowOn(["home", "tour", "testimonials"], true))
      assert.deepEqual((await getReviewById(id))!.showOn, ["home", "tour", "testimonials"])
      assert.ok((await getApprovedReviews("tour")).some((r) => r.id === id))
    })

    await step("multi-photo persist + holiday import create", async () => {
      const photos = serializeReviewPhotoUrls(["/a.jpg", "/b.jpg"])
      await createReview({
        type: "TEXT",
        name: `${stamp}-photos`,
        tour: "Bus X",
        text: "фото",
        rating: 4,
        approved: true,
        showOn: ["testimonials"],
        thumbnailUrl: photos,
      })
      const photoRow = (await getReviews()).find((r) => r.name === `${stamp}-photos`)
      assert.ok(photoRow)
      ids.push(photoRow!.id)
      assert.deepEqual(parseReviewPhotoUrls(photoRow!.thumbnailUrl), ["/a.jpg", "/b.jpg"])

      const [holiday] = parseHolidayReviewsHtml(`
        <div class="comment-card">
          <div class="comment-card__name">Holiday User</div>
          <div class="date-comment-card">13 мая 2016</div>
          <div class="comment-card__content"><p>Импорт ${stamp}</p></div>
        </div>
      `)
      assert.ok(holiday)
      await createReview({
        type: "TEXT",
        name: holiday!.name,
        tour: "",
        text: holiday!.text,
        rating: 5,
        source: "holiday_by",
        sourceId: holiday!.sourceId,
        sourceDate: holiday!.date,
        approved: false,
        showOn: [],
      })
      const imported = (await getReviews()).find((r) => r.sourceId === holiday!.sourceId)
      assert.ok(imported)
      ids.push(imported!.id)
      assert.equal(imported!.approved, false)
      assert.equal(imported!.source, "holiday_by")
    })

    console.log("review-lifecycle.selfcheck: ok")
  } finally {
    for (const id of ids) {
      try {
        await purgeReview(id)
      } catch {
        /* ignore */
      }
    }
    try {
      fs.unlinkSync(dbFile)
    } catch {
      /* ignore */
    }
  }
}

if (!hasSelfcheckPostgres()) {
  console.log(skipRuntimeMessage("review-lifecycle.selfcheck.ts"))
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
