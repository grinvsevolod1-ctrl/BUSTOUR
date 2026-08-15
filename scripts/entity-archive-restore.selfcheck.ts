/**
 * Entity archive → restore → public/list getter for tour + bus + article.
 * Prefer this over per-entity twin files. Temp DB.
 * Run: npx tsx scripts/entity-archive-restore.selfcheck.ts
 */
import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"import { hasSelfcheckPostgres, skipRuntimeMessage } from "./lib/selfcheck-db"


async function main() {
  const dbFile = path.join(os.tmpdir(), `bustour-entity-archive-${Date.now()}.db`)

  const { ensureDb } = await import("../lib/db/init")
  const {
    createTour,
    deleteTour,
    restoreTour,
    purgeTour,
    getTours,
    getArchivedTours,
    getTour,
    createBus,
    deleteBus,
    restoreBus,
    purgeBus,
    getBuses,
    getArchivedBuses,
    getBus,
    createArticle,
    deleteArticle,
    restoreArticle,
    purgeArticle,
    getArticles,
    getArchivedArticles,
    getArticle,
  } = await import("../lib/queries")
  const { createCountry } = await import("../lib/countries")
  const { createCity } = await import("../lib/cities")

  await ensureDb()
  const stamp = Date.now()

  // --- tour ---
  const countryId = await createCountry({
    slug: `ear-country-${stamp}`,
    name: `EAR Country ${stamp}`,
    category: "bus",
    intro: "",
    seoHtml: "",
  })
  const cityId = await createCity({
    slug: `ear-city-${stamp}`,
    name: `EAR City ${stamp}`,
    category: "bus",
    country: `EAR Country ${stamp}`,
    countryId,
    intro: "",
    sections: [],
    seoHtml: "",
  })
  const tourSlug = `ear-tour-${stamp}`
  const tourId = await createTour({
    slug: tourSlug,
    title: `EAR Tour ${stamp}`,
    description: "",
    price: "100",
    priceAmount: 100,
    image: "",
    tourType: "",
    duration: "",
    departure: "",
    country: `EAR Country ${stamp}`,
    countryId,
    arrivalCityId: cityId,
    nights: 1,
    featured: false,
    program: [],
    included: [],
    excluded: [],
    whatIncluded: [],
    seoHtml: "",
    seoTitle: "",
    alertText: "",
    alertType: "info",
    gallery: [],
    documents: [],
    layout: [],
  })
  await deleteTour(tourId)
  assert.ok((await getArchivedTours()).some((t) => t.id === tourId))
  assert.equal(await getTour(tourSlug), undefined)
  await restoreTour(tourId)
  assert.ok(await getTour(tourSlug))
  assert.equal((await getTours()).some((t) => t.id === tourId), true)
  await deleteTour(tourId)
  await purgeTour(tourId)

  // --- bus ---
  const busSlug = `ear-bus-${stamp}`
  const busId = await createBus({
    slug: busSlug,
    title: `EAR Bus ${stamp}`,
    image: "",
    gallery: [],
    year: "2020",
    seats: "50",
    busClass: "tourist",
    phone: "",
    documents: [],
    seating: [],
  })
  await deleteBus(busId)
  assert.ok((await getArchivedBuses()).some((b) => b.id === busId))
  assert.equal(await getBus(busSlug), undefined)
  await restoreBus(busId)
  assert.ok(await getBus(busSlug))
  assert.equal((await getBuses()).some((b) => b.id === busId), true)
  await deleteBus(busId)
  await purgeBus(busId)

  // --- article ---
  const articleSlug = `ear-article-${stamp}`
  await createArticle({
    slug: articleSlug,
    title: `EAR Article ${stamp}`,
    category: "news",
    excerpt: "",
    image: "",
    date: "2026-07-24",
    content: [],
    contentHtml: "<p>ear</p>",
    metaTitle: "",
    metaDescription: "",
    metaShortDesc: "",
    metaImage: "",
    metaImageAlt: "",
  })
  const article = (await getArticles()).find((a) => a.slug === articleSlug)!
  assert.ok(article)
  await deleteArticle(article.id)
  assert.equal(await getArticle(articleSlug), undefined)
  assert.ok((await getArchivedArticles()).some((a) => a.id === article.id))
  await restoreArticle(article.id)
  assert.ok(await getArticle(articleSlug))
  await deleteArticle(article.id)
  await purgeArticle(article.id)

  try {
    fs.unlinkSync(dbFile)
  } catch {
    /* ignore */
  }
  console.log("entity-archive-restore selfcheck: ok")
}

if (!hasSelfcheckPostgres()) {
  console.log(skipRuntimeMessage("entity-archive-restore.selfcheck.ts"))
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
