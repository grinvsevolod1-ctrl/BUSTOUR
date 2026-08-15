/**
 * Soft-delete / slug-release / city-country guards + full lifecycle purge.
 * Run: npx tsx scripts/soft-delete-entities.selfcheck.ts
 */
import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { toArchivedSlug } from "../lib/archive-slug"import { hasSelfcheckPostgres, skipRuntimeMessage } from "./lib/selfcheck-db"


assert.equal(toArchivedSlug("paris", 1000), "paris-archived-1000")
assert.equal(toArchivedSlug("paris-archived-1000", 2000), "paris-archived-1000")

async function main() {
  const dbFile = path.join(os.tmpdir(), `bustour-soft-delete-${Date.now()}.db`)

  const { ensureDb } = await import("../lib/db/init")
  const {
    createBus,
    deleteBus,
    restoreBus,
    purgeBus,
    getBuses,
    getArchivedBuses,
    getBus,
    createReview,
    deleteReview,
    restoreReview,
    purgeReview,
    getReviews,
    getArchivedReviews,
    getApprovedReviews,
    createStaffMember,
    deleteStaffMember,
    restoreStaffMember,
    purgeStaffMember,
    getStaff,
    getArchivedStaff,
    createTransfer,
    deleteTransfer,
    restoreTransfer,
    purgeTransfer,
    getTransfers,
    getArchivedTransfers,
    getTransfer,
    createLead,
    deleteLead,
    restoreLead,
    purgeLead,
    getLeads,
    getArchivedLeads,
    createTour,
    deleteTour,
    restoreTour,
    purgeTour,
    getTours,
    getTour,
    getArchivedTours,
    countToursByCityId,
    countToursByCountryId,
    createArticle,
    deleteArticle,
    restoreArticle,
    purgeArticle,
    getArticles,
    getArchivedArticles,
    getArticle,
  } = await import("../lib/queries")
  const { createCountry, deleteCountry, restoreCountry, purgeCountry, getArchivedCountries, getCountries } =
    await import("../lib/countries")
  const { createCity, deleteCity, restoreCity, purgeCity, getArchivedCities, getCityDestinations } =
    await import("../lib/cities")

  await ensureDb()

  // --- slug release: bus (full cycle ends with purge) ---
  const busSlug = `soft-del-bus-${Date.now()}`
  const busBlank = {
    image: "",
    gallery: [] as [],
    year: "2020",
    seats: "50",
    busClass: "tourist",
    phone: "",
    documents: [] as [],
    seating: [] as [],
  }
  const busId = await createBus({
    slug: busSlug,
    title: "Soft Delete Bus",
    ...busBlank,
  })
  await deleteBus(busId)
  const archivedBus = (await getArchivedBuses()).find((b) => b.id === busId)
  assert.ok(archivedBus)
  assert.match(archivedBus!.slug, new RegExp(`^${busSlug}-archived-\\d+$`))
  assert.equal(await getBus(busSlug), undefined)
  const busId2 = await createBus({
    slug: busSlug,
    title: "Reuse Slug Bus",
    ...busBlank,
    year: "2021",
    seats: "40",
  })
  assert.ok(busId2)
  assert.equal((await getBuses()).some((b) => b.id === busId2 && b.slug === busSlug), true)
  await assert.rejects(() => restoreBus(busId), /уже занят/)
  await purgeBus(busId2)
  await restoreBus(busId)
  assert.equal((await getBuses()).some((b) => b.id === busId && b.slug === busSlug), true)
  assert.ok(await getBus(busSlug))
  await deleteBus(busId)
  await purgeBus(busId)
  assert.equal((await getArchivedBuses()).some((b) => b.id === busId), false)

  // --- reviews: create → archive → restore → verify → archive → purge ---
  await createReview({
    type: "TEXT",
    name: "Soft Delete Reviewer",
    tour: "",
    text: "temp",
    rating: 5,
    approved: true,
    showOn: ["home"],
  })
  const review = (await getReviews()).find((r) => r.name === "Soft Delete Reviewer")
  assert.ok(review)
  await deleteReview(review!.id)
  assert.equal((await getReviews()).some((r) => r.id === review!.id), false)
  assert.equal((await getApprovedReviews()).some((r) => r.id === review!.id), false)
  assert.equal((await getArchivedReviews()).some((r) => r.id === review!.id), true)
  await restoreReview(review!.id)
  assert.equal((await getReviews()).some((r) => r.id === review!.id), true)
  await deleteReview(review!.id)
  await purgeReview(review!.id)
  assert.equal((await getArchivedReviews()).some((r) => r.id === review!.id), false)

  // --- staff ---
  await createStaffMember({
    name: "Soft Delete Staff",
    position: "test",
    email: "",
    phone: "",
    photo: "",
    sortOrder: 9999,
  })
  const member = (await getStaff()).find((s) => s.name === "Soft Delete Staff")
  assert.ok(member)
  await deleteStaffMember(member!.id)
  assert.equal((await getStaff()).some((s) => s.id === member!.id), false)
  assert.equal((await getArchivedStaff()).some((s) => s.id === member!.id), true)
  await restoreStaffMember(member!.id)
  assert.equal((await getStaff()).some((s) => s.id === member!.id), true)
  await deleteStaffMember(member!.id)
  await purgeStaffMember(member!.id)
  assert.equal((await getArchivedStaff()).some((s) => s.id === member!.id), false)

  // --- transfers ---
  const transferId = await createTransfer({
    slug: `soft-del-transfer-${Date.now()}`,
    category: "airport",
    title: "Soft Delete Transfer",
    intro: "",
    priceRoundTrip: 10,
    priceOneWay: 5,
    image: "",
  })
  const transferSlug = (await getTransfers()).find((t) => t.id === transferId)!.slug
  await deleteTransfer(transferId)
  assert.equal(await getTransfer(transferSlug), undefined)
  const archivedTransfer = (await getArchivedTransfers()).find((t) => t.id === transferId)
  assert.ok(archivedTransfer)
  assert.match(archivedTransfer!.slug, new RegExp(`^${transferSlug}-archived-\\d+$`))
  await restoreTransfer(transferId)
  assert.equal((await getTransfers()).find((t) => t.id === transferId)?.slug, transferSlug)
  await deleteTransfer(transferId)
  await purgeTransfer(transferId)
  assert.equal((await getArchivedTransfers()).some((t) => t.id === transferId), false)

  // --- leads ---
  const lead = await createLead({
    name: "Soft Delete Lead",
    phone: "+375291112233",
    type: "contact",
  })
  await deleteLead(lead.id)
  assert.equal((await getLeads()).some((l) => l.id === lead.id), false)
  assert.equal((await getArchivedLeads()).some((l) => l.id === lead.id), true)
  await restoreLead(lead.id)
  assert.equal((await getLeads()).some((l) => l.id === lead.id), true)
  await deleteLead(lead.id)
  await purgeLead(lead.id)
  assert.equal((await getArchivedLeads()).some((l) => l.id === lead.id), false)

  // --- articles ---
  const articleSlug = `soft-article-${Date.now()}`
  await createArticle({
    slug: articleSlug,
    title: "Soft Delete Article",
    category: "news",
    excerpt: "",
    image: "",
    date: "2026-07-24",
    content: [],
    contentHtml: "<p>x</p>",
    metaTitle: "",
    metaDescription: "",
    metaShortDesc: "",
    metaImage: "",
    metaImageAlt: "",
  })
  const article = (await getArticles()).find((a) => a.slug === articleSlug)
  assert.ok(article)
  await deleteArticle(article!.id)
  assert.equal(await getArticle(articleSlug), undefined)
  assert.equal((await getArchivedArticles()).some((a) => a.id === article!.id), true)
  await restoreArticle(article!.id)
  assert.ok(await getArticle(articleSlug))
  await deleteArticle(article!.id)
  await purgeArticle(article!.id)
  assert.equal((await getArchivedArticles()).some((a) => a.id === article!.id), false)

  // --- city/country guards + slug release + purge ---
  const stamp = Date.now()
  const countryId = await createCountry({
    slug: `soft-country-${stamp}`,
    name: `Soft Country ${stamp}`,
    category: "bus",
    intro: "",
    seoHtml: "",
  })
  const cityId = await createCity({
    slug: `soft-city-${stamp}`,
    name: `Soft City ${stamp}`,
    category: "bus",
    country: `Soft Country ${stamp}`,
    countryId,
    intro: "",
    sections: [],
    seoHtml: "",
  })
  const tourId = await createTour({
    slug: `soft-tour-${stamp}`,
    title: `Soft Tour ${stamp}`,
    description: "",
    price: "100",
    priceAmount: 100,
    image: "",
    tourType: "",
    duration: "",
    departure: "",
    country: `Soft Country ${stamp}`,
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

  assert.equal(await countToursByCityId(cityId), 1)
  assert.equal(await countToursByCountryId(countryId), 1)

  await assert.rejects(async () => deleteCity(cityId), /активные туры/)
  await assert.rejects(async () => deleteCountry(countryId), /активные туры/)

  await deleteTour(tourId)
  const archivedTour = (await getArchivedTours()).find((t) => t.id === tourId)
  assert.match(archivedTour!.slug, new RegExp(`^soft-tour-${stamp}-archived-\\d+$`))

  await restoreTour(tourId)
  assert.equal((await getTours()).some((t) => t.id === tourId && t.slug === `soft-tour-${stamp}`), true)
  assert.ok(await getTour(`soft-tour-${stamp}`))
  await deleteTour(tourId)
  await purgeTour(tourId)
  assert.equal((await getArchivedTours()).some((t) => t.id === tourId), false)

  assert.equal(await countToursByCityId(cityId), 0)
  await deleteCity(cityId)
  const archivedCity = (await getArchivedCities()).find((c) => c.id === cityId)
  assert.match(archivedCity!.slug, new RegExp(`^soft-city-${stamp}-archived-\\d+$`))
  await restoreCity(cityId)
  assert.equal(
    (await getCityDestinations("bus")).some((c) => c.id === cityId && c.slug === `soft-city-${stamp}`),
    true,
  )
  await deleteCity(cityId)
  await purgeCity(cityId)
  assert.equal((await getArchivedCities()).some((c) => c.id === cityId), false)

  assert.equal(await countToursByCountryId(countryId), 0)
  await deleteCountry(countryId)
  const archivedCountry = (await getArchivedCountries()).find((c) => c.id === countryId)
  assert.match(archivedCountry!.slug, new RegExp(`^soft-country-${stamp}-archived-\\d+$`))
  await restoreCountry(countryId)
  assert.equal(
    (await getCountries("bus")).some((c) => c.id === countryId && c.slug === `soft-country-${stamp}`),
    true,
  )
  await deleteCountry(countryId)
  await purgeCountry(countryId)
  assert.equal((await getArchivedCountries()).some((c) => c.id === countryId), false)

  try {
    fs.unlinkSync(dbFile)
  } catch {
    /* ignore */
  }

  console.log("soft-delete entities selfcheck: ok")
}

if (!hasSelfcheckPostgres()) {
  console.log(skipRuntimeMessage("soft-delete-entities.selfcheck.ts"))
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
