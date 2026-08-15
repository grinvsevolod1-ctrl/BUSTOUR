/**
 * Admin CRUD consistency self-check (tours / buses / reviews + validation + guards).
 * Calls lib mutations + Zod schemas (Server Action cores), not the browser UI.
 * Run: npx tsx scripts/admin-api.selfcheck.ts
 */
import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { eq } from "drizzle-orm"
import {
  slugSchema,
  tourSaveSchema,
  busSaveSchema,
  articleSaveSchema,
} from "../lib/validations/admin"
import { mapDbError } from "../lib/db-errors"
import { reviewInputSchema } from "../lib/review-schema"
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
    fail(`${label}: ${err instanceof Error ? err.message : String(err)}`)
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
    description: "desc",
    price: "100",
    priceAmount: 100,
    image: "/images/x.png",
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
    whatIncluded: [] as import("../lib/types").IncludedGroup[],
    seoHtml: "<p>seo</p>",
    seoTitle: "SEO",
    alertText: "",
    alertType: "info" as const,
    gallery: [] as string[],
    documents: [] as { title: string; href: string; size: string }[],
    layout: [] as { key: string; label: string; visible: boolean }[],
  }
}

async function main() {
  // --- Zod unit checks (no DB) ---
  await step("Zod: slugSchema rejects Bad_Slug / кириллицу", async () => {
    assert.equal(slugSchema.safeParse("Bad_Slug").success, false)
    assert.equal(slugSchema.safeParse("питере").success, false)
    assert.equal(slugSchema.safeParse("good-slug-1").success, true)
  })

  await step("Zod: tourSaveSchema / busSaveSchema / review STI", async () => {
    assert.equal(tourSaveSchema.safeParse({ slug: "t", title: "", description: "d", priceAmount: 1, image: "i", seoTitle: "s", seoHtml: "h" }).success, false)
    assert.equal(busSaveSchema.safeParse({ slug: "bus-1", title: "Bus" }).success, true)
    assert.equal(articleSaveSchema.safeParse({ slug: "a", title: "T", date: "", metaTitle: "m", metaDescription: "d", metaShortDesc: "s", metaImage: "i" }).success, false)
    assert.equal(reviewInputSchema.safeParse({ type: "TEXT", name: "A", tour: "", text: "ok", rating: 5 }).success, true)
    assert.equal(reviewInputSchema.safeParse({ type: "VIDEO", name: "V", tour: "", text: "", rating: 5, videoUrl: "", thumbnailUrl: "t" }).success, false)
  })

  await step("mapDbError: unique slug → readable message", async () => {
    const msg = mapDbError(new Error("SQLITE_CONSTRAINT_UNIQUE: UNIQUE constraint failed: tours.slug"))
    assert.match(msg, /slug/i)
  })

  const dbFile = path.join(os.tmpdir(), `bustour-admin-api-${Date.now()}.db`)

  const { ensureDb } = await import("../lib/db/init")
  const { db } = await import("../lib/db")
  const { tours, buses, reviews, countries, cityDestinations } = await import("../lib/db/schema")
  const {
    createTour,
    deleteTour,
    createBus,
    deleteBus,
    createReview,
    getArchivedTours,
    getBuses,
    getReviews,
    findTourIdBySlug,
    findArticleIdBySlug,
    createArticle,
  } = await import("../lib/queries")
  const { createCountry, purgeCountry } = await import("../lib/countries")
  const { createCity, purgeCity } = await import("../lib/cities")

  await ensureDb()
  const stamp = Date.now()
  const ids = { tour: 0, bus: 0, reviewSource: `${stamp}-rev`, country: 0, city: 0 }

  ids.country = await createCountry({
    slug: `admin-api-city-country-${stamp}`,
    name: `API City Country ${stamp}`,
    category: "bus",
    intro: "",
    seoHtml: "",
  })
  ids.city = await createCity({
    slug: `admin-api-city-${stamp}`,
    name: `API City ${stamp}`,
    category: "bus",
    country: `API City Country ${stamp}`,
    countryId: ids.country,
    intro: "",
    sections: [],
    seoHtml: "",
  })
  const tourBase = { country: `API City Country ${stamp}`, countryId: ids.country, arrivalCityId: ids.city }

  try {
    await step("CRUD: createTour + read + archive (slug release)", async () => {
      const slug = `admin-api-tour-${stamp}`
      ids.tour = await createTour(
        emptyTour({ slug, title: `Tour ${stamp}`, ...tourBase }),
      )
      const [row] = await db.select().from(tours).where(eq(tours.id, ids.tour)).limit(1)
      assert.equal(row!.slug, slug)
      assert.equal(row!.archived, false)
      await deleteTour(ids.tour)
      const archived = (await getArchivedTours()).find((t) => t.id === ids.tour)
      assert.ok(archived)
      assert.match(archived!.slug, /-archived-\d+$/)
      const again = await createTour(
        emptyTour({ slug, title: `Tour reuse ${stamp}`, ...tourBase }),
      )
      assert.ok(again)
      await db.delete(tours).where(eq(tours.id, again))
    })

    await step("preflight: findTourIdBySlug blocks duplicate live slug", async () => {
      const slug = `admin-api-preflight-${stamp}`
      const a = await createTour(emptyTour({ slug, title: `A ${stamp}`, ...tourBase }))
      assert.equal(await findTourIdBySlug(slug), a)
      const owner = await findTourIdBySlug(slug)
      assert.ok(owner && owner !== 0)
      await db.delete(tours).where(eq(tours.id, a))
      assert.equal(await findTourIdBySlug(slug), undefined)
    })

    await step("preflight: findArticleIdBySlug", async () => {
      const slug = `admin-api-art-${stamp}`
      await createArticle({
        slug,
        title: `Art ${stamp}`,
        category: "news",
        excerpt: "",
        image: "/x.png",
        date: "2026-01-01",
        content: [],
        contentHtml: "",
        metaTitle: "m",
        metaDescription: "d",
        metaShortDesc: "s",
        metaImage: "",
        metaImageAlt: "",
      })
      const owner = await findArticleIdBySlug(slug)
      assert.ok(owner)
      assert.equal(await findArticleIdBySlug(`missing-${stamp}`), undefined)
      const { articles } = await import("../lib/db/schema")
      await db.delete(articles).where(eq(articles.id, owner!))
    })

    await step("CRUD: createBus + archive", async () => {
      const slug = `admin-api-bus-${stamp}`
      ids.bus = await createBus({
        slug,
        title: `Bus ${stamp}`,
        image: "",
        gallery: [],
        year: "2020",
        seats: "50",
        busClass: "tourist",
        phone: "",
        documents: [],
      })
      assert.equal((await getBuses()).some((b) => b.id === ids.bus), true)
      await deleteBus(ids.bus)
      assert.equal((await getBuses()).some((b) => b.id === ids.bus), false)
      const [row] = await db.select().from(buses).where(eq(buses.id, ids.bus)).limit(1)
      assert.equal(row!.archived, true)
      assert.match(row!.slug, /-archived-\d+$/)
    })

    await step("CRUD: TEXT + VIDEO reviews in one table", async () => {
      await createReview({
        type: "TEXT",
        name: `api-text-${stamp}`,
        tour: "",
        text: "text body",
        rating: 4,
        sourceId: `${ids.reviewSource}-t`,
      })
      await createReview({
        type: "VIDEO",
        name: `api-video-${stamp}`,
        tour: "",
        text: "",
        rating: 5,
        videoUrl: "/uploads/v.mp4",
        thumbnailUrl: "/uploads/t.jpg",
        sourceId: `${ids.reviewSource}-v`,
      })
      const list = await getReviews()
      const text = list.find((r) => r.sourceId === `${ids.reviewSource}-t`)
      const video = list.find((r) => r.sourceId === `${ids.reviewSource}-v`)
      assert.equal(text?.type, "TEXT")
      assert.equal(video?.type, "VIDEO")
      assert.equal(video?.thumbnailUrl.includes("t.jpg"), true)
    })

    await step("Guard: purgeCountry blocked while tour exists", async () => {
      const tourId = await createTour(
        emptyTour({
          slug: `admin-api-guard-${stamp}`,
          title: `Guard ${stamp}`,
          ...tourBase,
        }),
      )
      await assert.rejects(() => purgeCountry(ids.country), /туры/)
      const [c] = await db.select().from(countries).where(eq(countries.id, ids.country)).limit(1)
      assert.ok(c)
      await db.delete(tours).where(eq(tours.id, tourId))
    })
  } finally {
    if (ids.tour) await db.delete(tours).where(eq(tours.id, ids.tour))
    if (ids.bus) await db.delete(buses).where(eq(buses.id, ids.bus))
    await db.delete(reviews).where(eq(reviews.sourceId, `${ids.reviewSource}-t`))
    await db.delete(reviews).where(eq(reviews.sourceId, `${ids.reviewSource}-v`))
    if (ids.city) {
      try {
        await purgeCity(ids.city)
      } catch {
        await db.delete(cityDestinations).where(eq(cityDestinations.id, ids.city)).catch(() => null)
      }
    }
    if (ids.country) {
      try {
        await purgeCountry(ids.country)
      } catch {
        await db.delete(countries).where(eq(countries.id, ids.country)).catch(() => null)
      }
    }
    try {
      fs.unlinkSync(dbFile)
    } catch {
      /* ignore */
    }
    ok("Cleanup hard-delete")
  }

  console.log(`${GREEN}admin-api selfcheck: ok${RESET}`)
}

if (!hasSelfcheckPostgres()) {
  console.log(skipRuntimeMessage("admin-api.selfcheck.ts"))
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
