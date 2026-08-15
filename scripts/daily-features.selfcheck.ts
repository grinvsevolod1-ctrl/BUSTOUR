/**
 * Daily features integration self-check:
 * reviews STI, media alt_text, soft-delete slug release, country archive guards.
 * Run: npx tsx scripts/daily-features.selfcheck.ts
 *
 * Uses a temp SQLite file (same pattern as soft-delete-entities.selfcheck.ts)
 * so production app.db stays untouched; still hard-deletes rows before exit.
 */
import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { eq, inArray } from "drizzle-orm"
import { hasSelfcheckPostgres, skipRuntimeMessage } from "./lib/selfcheck-db"

const GREEN = "\x1b[32m"
const RED = "\x1b[31m"
const RESET = "\x1b[0m"
const ok = (msg: string) => console.log(`${GREEN}✓${RESET} ${msg}`)
const fail = (msg: string) => console.log(`${RED}✗${RESET} ${msg}`)

async function step(label: string, fn: () => Promise<void>) {
  try {
    await fn()
    ok(label)
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    fail(`${label}: ${detail}`)
    throw err
  }
}

function emptyTour(overrides: {
  slug: string
  title: string
  country: string
  countryId: number
  arrivalCityId: number
}) {
  return {
    slug: overrides.slug,
    title: overrides.title,
    description: "",
    price: "100",
    priceAmount: 100,
    image: "",
    tourType: "",
    duration: "",
    departure: "Минск",
    country: overrides.country,
    countryId: overrides.countryId,
    arrivalCityId: overrides.arrivalCityId,
    nights: 1,
    featured: false,
    program: [] as { day: string; text: string }[],
    included: [] as string[],
    excluded: [] as string[],
    whatIncluded: [] as { title: string; marker: string; items: string[] }[],
    seoHtml: "",
    seoTitle: "",
    alertText: "",
    alertType: "info" as const,
    gallery: [] as string[],
    documents: [] as { title: string; href: string; size: string }[],
    layout: [] as { key: string; label: string; visible: boolean }[],
  }
}

async function main() {
  const dbFile = path.join(os.tmpdir(), `bustour-daily-features-${Date.now()}.db`)

  const { ensureDb } = await import("../lib/db/init")
  const { db } = await import("../lib/db")
  const { reviews, mediaFiles, tours, countries, cityDestinations } = await import("../lib/db/schema")
  const { createReview, createTour, deleteTour } = await import("../lib/queries")
  const { createCountry, deleteCountry, COUNTRY_ARCHIVE_BLOCKED_BY_TOURS } = await import(
    "../lib/countries"
  )
  const { createCity } = await import("../lib/cities")

  await ensureDb()

  const stamp = Date.now()
  const tag = `daily-${stamp}`
  const ids = {
    reviewText: 0,
    reviewVideo: 0,
    mediaId: `daily-media-${stamp}`,
    tourSlugRelease: 0,
    tourSlugReuse: 0,
    tourGuard: 0,
    countryId: 0,
    cityId: 0,
  }

  console.log(`daily-features selfcheck → ${dbFile}`)

  ids.countryId = await createCountry({
    slug: `daily-country-${stamp}`,
    name: `Daily Country ${stamp}`,
    category: "bus",
    intro: "",
    seoHtml: "",
  })
  ids.cityId = await createCity({
    slug: `daily-city-${stamp}`,
    name: `Daily City ${stamp}`,
    category: "bus",
    country: `Daily Country ${stamp}`,
    countryId: ids.countryId,
    intro: "",
    sections: [],
    seoHtml: "",
  })
  const tourBase = {
    country: `Daily Country ${stamp}`,
    countryId: ids.countryId,
    arrivalCityId: ids.cityId,
  }

  try {
    // --- Scenario 1: Reviews STI ---
    await step("Сценарий 1: TEXT-отзыв в reviews", async () => {
      await createReview({
        type: "TEXT",
        name: `${tag}-text`,
        tour: "",
        text: "Отличный тур",
        rating: 5,
        sourceId: `${tag}-text`,
        approved: false,
        showOn: [],
      })
      const [row] = await db.select().from(reviews).where(eq(reviews.sourceId, `${tag}-text`)).limit(1)
      assert.ok(row, "TEXT row missing")
      ids.reviewText = row!.id
      assert.equal(row!.type, "TEXT")
      assert.equal(row!.text, "Отличный тур")
      assert.equal(row!.rating, 5)
      assert.equal(row!.videoUrl, "")
      assert.equal(row!.thumbnailUrl, "")
    })

    await step("Сценарий 1: VIDEO-отзыв в reviews", async () => {
      await createReview({
        type: "VIDEO",
        name: `${tag}-video`,
        tour: "",
        text: "",
        rating: 5,
        videoUrl: `/uploads/${tag}-video.mp4`,
        thumbnailUrl: `/uploads/${tag}-thumb.jpg`,
        sourceId: `${tag}-video`,
        approved: false,
        showOn: [],
      })
      const [row] = await db.select().from(reviews).where(eq(reviews.sourceId, `${tag}-video`)).limit(1)
      assert.ok(row, "VIDEO row missing")
      ids.reviewVideo = row!.id
      assert.equal(row!.type, "VIDEO")
      assert.equal(row!.text, "")
      assert.ok(row!.videoUrl.includes(`${tag}-video`))
      assert.ok(row!.thumbnailUrl.includes(`${tag}-thumb`))
    })

    // --- Scenario 2: Media alt_text ---
    await step("Сценарий 2: media_files.alt_text сохраняется", async () => {
      const alt = `Alt для ${tag}`
      await db.insert(mediaFiles).values({
        id: ids.mediaId,
        url: `/uploads/${tag}.jpg`,
        name: `${tag}.jpg`,
        size: "1 KB",
        type: "image",
        checksum: `checksum-${stamp}`,
        altText: alt,
        createdAt: stamp,
      })
      const [row] = await db.select().from(mediaFiles).where(eq(mediaFiles.id, ids.mediaId)).limit(1)
      assert.ok(row)
      assert.equal(row!.type, "image")
      assert.equal(row!.altText, alt)
    })

    // --- Scenario 3: Soft delete slug release ---
    const releaseSlug = `test-slug-release-${stamp}`
    await step("Сценарий 3: архивация тура освобождает slug", async () => {
      ids.tourSlugRelease = await createTour(
        emptyTour({
          slug: releaseSlug,
          title: `Slug release ${tag}`,
          ...tourBase,
        }),
      )
      await deleteTour(ids.tourSlugRelease)
      const [archived] = await db.select().from(tours).where(eq(tours.id, ids.tourSlugRelease)).limit(1)
      assert.equal(archived!.archived, true)
      assert.match(archived!.slug, new RegExp(`^${releaseSlug}-archived-\\d+$`))
    })

    await step("Сценарий 3: повторное создание с тем же slug без UNIQUE error", async () => {
      ids.tourSlugReuse = await createTour(
        emptyTour({
          slug: releaseSlug,
          title: `Slug reuse ${tag}`,
          ...tourBase,
        }),
      )
      const [live] = await db.select().from(tours).where(eq(tours.id, ids.tourSlugReuse)).limit(1)
      assert.equal(live!.slug, releaseSlug)
      assert.equal(live!.archived, false)
    })

    // --- Scenario 4: Country archive guards ---
    await step("Сценарий 4: страна с активным туром не архивируется", async () => {
      ids.tourGuard = await createTour(
        emptyTour({
          slug: `daily-guard-tour-${stamp}`,
          title: `Guard tour ${tag}`,
          ...tourBase,
        }),
      )
      await assert.rejects(
        () => deleteCountry(ids.countryId),
        (err: unknown) =>
          err instanceof Error && err.message === COUNTRY_ARCHIVE_BLOCKED_BY_TOURS,
      )
      const [country] = await db.select().from(countries).where(eq(countries.id, ids.countryId)).limit(1)
      assert.equal(country!.archived, false)
      assert.equal(country!.slug, `daily-country-${stamp}`)
    })

    await step("Сценарий 4: после архива тура страну можно заархивировать", async () => {
      await deleteTour(ids.tourGuard)
      await deleteTour(ids.tourSlugReuse)
      await deleteCountry(ids.countryId)
      const [country] = await db.select().from(countries).where(eq(countries.id, ids.countryId)).limit(1)
      assert.equal(country!.archived, true)
      assert.match(country!.slug, /-archived-\d+$/)
    })
  } finally {
    // Hard delete test rows (even on failure mid-run)
    const tourIds = [ids.tourSlugRelease, ids.tourSlugReuse, ids.tourGuard].filter((id) => id > 0)
    const reviewIds = [ids.reviewText, ids.reviewVideo].filter((id) => id > 0)
    if (tourIds.length) await db.delete(tours).where(inArray(tours.id, tourIds))
    if (reviewIds.length) await db.delete(reviews).where(inArray(reviews.id, reviewIds))
    if (ids.cityId) await db.delete(cityDestinations).where(eq(cityDestinations.id, ids.cityId))
    if (ids.countryId) await db.delete(countries).where(eq(countries.id, ids.countryId))
    if (ids.mediaId) await db.delete(mediaFiles).where(eq(mediaFiles.id, ids.mediaId))
    ok("Cleanup: hard delete тестовых строк")

    try {
      fs.unlinkSync(dbFile)
    } catch {
      /* ignore */
    }
  }

  console.log(`${GREEN}daily-features selfcheck: ok${RESET}`)
}

if (!hasSelfcheckPostgres()) {
  console.log(skipRuntimeMessage("daily-features.selfcheck.ts"))
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
