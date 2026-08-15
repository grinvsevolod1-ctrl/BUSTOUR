/**
 * Smoke: archive tour → restore → live list + public getter.
 * Run: npx tsx scripts/tour-archive-restore.selfcheck.ts
 */
import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"import { hasSelfcheckPostgres, skipRuntimeMessage } from "./lib/selfcheck-db"


async function main() {
  const dbFile = path.join(os.tmpdir(), `bustour-tour-archive-restore-${Date.now()}.db`)

  const { ensureDb } = await import("../lib/db/init")
  const { createTour, deleteTour, restoreTour, getTours, getArchivedTours, getTour } =
    await import("../lib/queries")
  const { createCountry } = await import("../lib/countries")
  const { createCity } = await import("../lib/cities")

  await ensureDb()
  const stamp = Date.now()
  const countryId = await createCountry({
    slug: `ar-country-${stamp}`,
    name: `AR Country ${stamp}`,
    category: "bus",
    intro: "",
    seoHtml: "",
  })
  const cityId = await createCity({
    slug: `ar-city-${stamp}`,
    name: `AR City ${stamp}`,
    category: "bus",
    country: `AR Country ${stamp}`,
    countryId,
    intro: "",
    sections: [],
    seoHtml: "",
  })
  const slug = `ar-tour-${stamp}`
  const title = `AR Tour ${stamp}`
  const tourId = await createTour({
    slug,
    title,
    description: "",
    price: "100",
    priceAmount: 100,
    image: "",
    tourType: "",
    duration: "",
    departure: "",
    country: `AR Country ${stamp}`,
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

  assert.equal((await getTours()).some((t) => t.id === tourId), true)

  await deleteTour(tourId)
  const archived = (await getArchivedTours()).find((t) => t.id === tourId)
  assert.ok(archived)
  assert.equal(archived!.archived, true)
  assert.match(archived!.slug, new RegExp(`^${slug}-archived-\\d+$`))
  assert.equal((await getTours()).some((t) => t.id === tourId), false)
  assert.equal(await getTour(slug), undefined)

  await restoreTour(tourId)
  const live = (await getTours()).find((t) => t.id === tourId)
  assert.ok(live, "restored tour must appear in getTours()")
  assert.equal(live!.archived, false)
  assert.equal(live!.slug, slug)
  assert.equal(live!.title, title)
  assert.equal((await getArchivedTours()).some((t) => t.id === tourId), false)
  const pub = await getTour(slug)
  assert.ok(pub, "public getTour(slug) must work after restore")
  assert.equal(pub!.id, tourId)

  try {
    fs.unlinkSync(dbFile)
  } catch {
    /* ignore */
  }
  console.log("tour-archive-restore selfcheck: ok")
}

if (!hasSelfcheckPostgres()) {
  console.log(skipRuntimeMessage("tour-archive-restore.selfcheck.ts"))
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
