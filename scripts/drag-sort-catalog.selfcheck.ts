/**
 * #30/#78 Manual drag-sort (up/down + drag/drop) for admin catalog rows.
 * Run: npx tsx scripts/drag-sort-catalog.selfcheck.ts
 */
import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { readQueriesSource } from "./lib/read-queries-source"
import { hasSelfcheckPostgres, skipRuntimeMessage } from "./lib/selfcheck-db"

const root = process.cwd()

function src(rel: string) {
  return readFileSync(join(root, rel), "utf8")
}

function mustHave(rel: string, needles: string[]) {
  // lib/queries.ts is a barrel — inspect it together with lib/queries/* modules
  const body = rel === "lib/queries.ts" ? readQueriesSource(root) : src(rel)
  for (const needle of needles) {
    assert.ok(body.includes(needle), `${rel} missing «${needle}»`)
  }
}

// --- Wiring: admin UI + actions ---
mustHave("lib/countries.ts", ["export async function moveCountry", "export async function reorderCountries"])
mustHave("lib/cities.ts", ["export async function moveCity", "export async function reorderCities"])
mustHave("lib/cms.ts", ["export async function moveBlock", "export async function reorderBlocks"])
mustHave("app/admin/country-actions.ts", ["moveCountryAction", "country_move"])
mustHave("app/admin/city-actions.ts", ["moveCityAction", "city_move"])
mustHave("app/admin/country-actions.ts", ["reorderCountriesAction", "country_reorder"])
mustHave("app/admin/city-actions.ts", ["reorderCitiesAction", "city_reorder"])
mustHave("app/admin/cms-actions.ts", ["reorderBlocksAction", "block_reorder"])
mustHave("components/admin/sort-order-buttons.tsx", ["SortOrderButtons", "Выше", "Ниже"])
mustHave("components/admin/reorder/use-reorder.ts", ["moveId", "useReorder"])
mustHave("components/admin/reorder/sortable-collections.tsx", ["SortableTableBody", "SortableList", "<tbody", "<ul", "Сохранение порядка"])
mustHave("components/admin/drag-reorder-control.tsx", ["DragHandle", "GripVertical"])
assert.ok(!src("components/admin/drag-reorder-control.tsx").includes("DragReorderControl"), "unsafe row wrapper was removed")
mustHave("app/admin/(protected)/countries/page.tsx", ["SortOrderButtons", "moveCountryAction", "SortableTableBody", "reorderCountriesAction"])
mustHave("app/admin/(protected)/cities/page.tsx", ["SortOrderButtons", "moveCityAction", "SortableTableBody", "reorderCitiesAction"])
mustHave("app/admin/(protected)/tours/page.tsx", ["TourCountryGroupTable", "moveTourAction", "reorderToursAction"])
mustHave("lib/queries.ts", ["moveTour", "reorderTours", "sortOrder"])
mustHave("components/admin/tour-country-group-table.tsx", ["SortableTableBody", "DragHandle", "SortOrderButtons"])
mustHave("app/admin/(protected)/content/[collection]/page.tsx", ["SortableList", "reorderBlocksAction"])
mustHave("lib/db/init.ts", ["datesFootnotes TEXT", "datesNoteType, datesCurrency, datesFootnotes, documents"])

// Public catalogs already orderBy sortOrder — lock that contract
mustHave("lib/countries.ts", ["orderBy(asc(countries.sortOrder)"])
mustHave("lib/cities.ts", ["orderBy(asc(cityDestinations.sortOrder)"])
mustHave("components/site/tours-listing.tsx", ["visibleCountryNames?.length", "ordered = [...visibleCountryNames]"])
mustHave("lib/countries.ts", ["getCountrySlugs", "eq(countries.archived, false)"])
mustHave("lib/hot-destinations.ts", ["orderHotSidebarCountryNames", "getCountries(\"hot\")"])
assert.ok(
  !src("lib/hot-destinations.ts").includes("const countryNames = Object.keys(citiesByCountry)"),
  "hot sidebar must not order countries via Object.keys(citiesByCountry)",
)

async function main() {
  const dbFile = path.join(os.tmpdir(), `bustour-drag-sort-${Date.now()}.db`)

  const { ensureDb } = await import("../lib/db/init")
  const { eq } = await import("drizzle-orm")
  const { db } = await import("../lib/db")
  const { countries, cityDestinations, contentBlocks } = await import("../lib/db/schema")
  const { createCountry, getCountries, moveCountry, reorderCountries, purgeCountry } = await import("../lib/countries")
  const { createCity, getCityDestinations, moveCity, reorderCities, purgeCity } = await import("../lib/cities")
  const { createBlock, deleteBlock, getBlocks, reorderBlocks } = await import("../lib/cms")
  const { createTour, getTours, moveTour, reorderTours, purgeTour } = await import("../lib/queries")
  const { tours } = await import("../lib/db/schema")

  await ensureDb()

  const stamp = Date.now()
  const cat = "bus" as const
  const countryIds: number[] = []
  const cityIds: number[] = []
  const blockIds: number[] = []
  const tourIds: number[] = []

  try {
    const cA = await createCountry({
      slug: `drag-sort-a-${stamp}`,
      name: `DragSort A ${stamp}`,
      category: cat,
      intro: "",
      seoHtml: "",
    })
    const cB = await createCountry({
      slug: `drag-sort-b-${stamp}`,
      name: `DragSort B ${stamp}`,
      category: cat,
      intro: "",
      seoHtml: "",
    })
    countryIds.push(cA, cB)

    const countryMax = (await getCountries(cat)).reduce((m, c) => Math.max(m, c.sortOrder), -1)
    await db.update(countries).set({ sortOrder: countryMax + 1 }).where(eq(countries.id, cA))
    await db.update(countries).set({ sortOrder: countryMax + 2 }).where(eq(countries.id, cB))

    let list = (await getCountries(cat)).filter((c) => countryIds.includes(c.id))
    assert.deepEqual(list.map((c) => c.id), [cA, cB], "countries initial order A then B")

    await moveCountry(cB, "up")
    list = (await getCountries(cat)).filter((c) => countryIds.includes(c.id))
    assert.deepEqual(list.map((c) => c.id), [cB, cA], "moveCountry up swaps B before A")

    await moveCountry(cB, "down")
    list = (await getCountries(cat)).filter((c) => countryIds.includes(c.id))
    assert.deepEqual(list.map((c) => c.id), [cA, cB], "moveCountry down restores A then B")

    const allCountries = await getCountries(cat)
    const allCountryIds = allCountries.map((c) => c.id)
    await reorderCountries([cB, cA, ...allCountryIds.filter((id) => id !== cA && id !== cB)])
    list = (await getCountries(cat)).filter((c) => countryIds.includes(c.id))
    assert.deepEqual(list.map((c) => c.id), [cB, cA], "reorderCountries moves B before A")

    await reorderCountries([cA, cB, ...allCountryIds.filter((id) => id !== cA && id !== cB)])
    list = (await getCountries(cat)).filter((c) => countryIds.includes(c.id))
    assert.deepEqual(list.map((c) => c.id), [cA, cB], "reorderCountries restores A then B")

    const cityA = await createCity({
      slug: `drag-city-a-${stamp}`,
      name: `DragCity A ${stamp}`,
      category: cat,
      country: `DragSort A ${stamp}`,
      countryId: cA,
      intro: "",
      sections: [],
      seoHtml: "",
    })
    const cityB = await createCity({
      slug: `drag-city-b-${stamp}`,
      name: `DragCity B ${stamp}`,
      category: cat,
      country: `DragSort A ${stamp}`,
      countryId: cA,
      intro: "",
      sections: [],
      seoHtml: "",
    })
    cityIds.push(cityA, cityB)

    const cityMax = (await getCityDestinations(cat)).reduce((m, c) => Math.max(m, c.sortOrder), -1)
    await db.update(cityDestinations).set({ sortOrder: cityMax + 1 }).where(eq(cityDestinations.id, cityA))
    await db.update(cityDestinations).set({ sortOrder: cityMax + 2 }).where(eq(cityDestinations.id, cityB))

    let cities = (await getCityDestinations(cat)).filter((c) => cityIds.includes(c.id))
    assert.deepEqual(cities.map((c) => c.id), [cityA, cityB], "cities initial order A then B")

    await moveCity(cityB, "up")
    cities = (await getCityDestinations(cat)).filter((c) => cityIds.includes(c.id))
    assert.deepEqual(cities.map((c) => c.id), [cityB, cityA], "moveCity up swaps B before A")

    await moveCity(cityB, "down")
    cities = (await getCityDestinations(cat)).filter((c) => cityIds.includes(c.id))
    assert.deepEqual(cities.map((c) => c.id), [cityA, cityB], "moveCity down restores A then B")

    const allCities = await getCityDestinations(cat)
    const allCityIds = allCities.map((c) => c.id)
    await reorderCities([cityB, cityA, ...allCityIds.filter((id) => id !== cityA && id !== cityB)])
    cities = (await getCityDestinations(cat)).filter((c) => cityIds.includes(c.id))
    assert.deepEqual(cities.map((c) => c.id), [cityB, cityA], "reorderCities moves B before A")

    await reorderCities([cityA, cityB, ...allCityIds.filter((id) => id !== cityA && id !== cityB)])
    cities = (await getCityDestinations(cat)).filter((c) => cityIds.includes(c.id))
    assert.deepEqual(cities.map((c) => c.id), [cityA, cityB], "reorderCities restores A then B")

    // Country accordion sends only in-group ids (partial list) — must still apply
    const cityC = await createCity({
      slug: `drag-city-c-${stamp}`,
      name: `DragCity C ${stamp}`,
      category: cat,
      country: `DragSort B ${stamp}`,
      countryId: cB,
      intro: "",
      sections: [],
      seoHtml: "",
    })
    cityIds.push(cityC)
    const cityMax2 = (await getCityDestinations(cat)).reduce((m, c) => Math.max(m, c.sortOrder), -1)
    // Interleave: A, C (other country), B — accordion for country A still shows [A, B]
    await db.update(cityDestinations).set({ sortOrder: cityMax2 + 1 }).where(eq(cityDestinations.id, cityA))
    await db.update(cityDestinations).set({ sortOrder: cityMax2 + 2 }).where(eq(cityDestinations.id, cityC))
    await db.update(cityDestinations).set({ sortOrder: cityMax2 + 3 }).where(eq(cityDestinations.id, cityB))

    await reorderCities([cityB, cityA]) // partial: country A group only
    const afterPartial = await getCityDestinations(cat)
    const orderOf = (id: number) => afterPartial.find((c) => c.id === id)!.sortOrder
    assert.ok(orderOf(cityB) < orderOf(cityC), "partial reorder: B before intervening C")
    assert.ok(orderOf(cityC) < orderOf(cityA), "partial reorder: C still between B and A")
    assert.deepEqual(
      afterPartial.filter((c) => c.country === `DragSort A ${stamp}`).map((c) => c.id),
      [cityB, cityA],
      "partial reorder: country A accordion order B then A",
    )

    await moveCity(cityA, "up")
    assert.deepEqual(
      (await getCityDestinations(cat)).filter((c) => c.country === `DragSort A ${stamp}`).map((c) => c.id),
      [cityA, cityB],
      "moveCity up swaps within country only",
    )
    assert.equal(
      (await getCityDestinations(cat)).find((c) => c.id === cityC)!.country,
      `DragSort B ${stamp}`,
      "moveCity within country does not touch other country row",
    )

    const emptyTour = (overrides: {
      slug: string
      title: string
      country: string
      countryId: number
      arrivalCityId: number
    }) => ({
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
      whatIncluded: [] as never[],
      seoHtml: "",
      seoTitle: "",
      alertText: "",
      alertType: "info" as const,
      gallery: [] as string[],
      documents: [] as { title: string; href: string; size: string }[],
      layout: [] as never[],
    })

    const tourA = await createTour(
      emptyTour({
        slug: `drag-tour-a-${stamp}`,
        title: `DragTour A ${stamp}`,
        country: `DragSort A ${stamp}`,
        countryId: cA,
        arrivalCityId: cityA,
      }),
    )
    const tourB = await createTour(
      emptyTour({
        slug: `drag-tour-b-${stamp}`,
        title: `DragTour B ${stamp}`,
        country: `DragSort A ${stamp}`,
        countryId: cA,
        arrivalCityId: cityA,
      }),
    )
    const tourC = await createTour(
      emptyTour({
        slug: `drag-tour-c-${stamp}`,
        title: `DragTour C ${stamp}`,
        country: `DragSort B ${stamp}`,
        countryId: cB,
        arrivalCityId: cityC,
      }),
    )
    tourIds.push(tourA, tourB, tourC)

    const tourMax = (await db.select({ sortOrder: tours.sortOrder }).from(tours)).reduce(
      (m, r) => Math.max(m, r.sortOrder),
      -1,
    )
    // Explicit sortOrder so swap isn't a no-op if createTour collided on defaults
    await db.update(tours).set({ sortOrder: tourMax + 1 }).where(eq(tours.id, tourA))
    await db.update(tours).set({ sortOrder: tourMax + 2 }).where(eq(tours.id, tourC))
    await db.update(tours).set({ sortOrder: tourMax + 3 }).where(eq(tours.id, tourB))

    let countryATours = (await getTours()).filter((t) => t.country === `DragSort A ${stamp}`)
    assert.deepEqual(
      countryATours.map((t) => t.id),
      [tourA, tourB],
      "tours initial country A order A then B",
    )

    await moveTour(tourB, "up")
    countryATours = (await getTours()).filter((t) => t.country === `DragSort A ${stamp}`)
    assert.deepEqual(countryATours.map((t) => t.id), [tourB, tourA], "moveTour up swaps within country")

    await moveTour(tourB, "down")
    countryATours = (await getTours()).filter((t) => t.country === `DragSort A ${stamp}`)
    assert.deepEqual(countryATours.map((t) => t.id), [tourA, tourB], "moveTour down restores")

    await reorderTours([tourB, tourA])
    const afterTourPartial = await getTours()
    const tourOrderOf = (id: number) => {
      const row = afterTourPartial.find((t) => t.id === id)
      assert.ok(row, `tour ${id}`)
      return afterTourPartial.findIndex((t) => t.id === id)
    }
    assert.ok(tourOrderOf(tourB) < tourOrderOf(tourC), "partial tour reorder: B before intervening C")
    assert.ok(tourOrderOf(tourC) < tourOrderOf(tourA), "partial tour reorder: C still between B and A")
    assert.deepEqual(
      afterTourPartial.filter((t) => t.country === `DragSort A ${stamp}`).map((t) => t.id),
      [tourB, tourA],
      "partial reorder: country A accordion order B then A",
    )

    await createBlock({
      collection: "advantage",
      title: `DragBlock A ${stamp}`,
      subtitle: "",
      body: "",
      image: "",
      icon: "",
      href: "",
      extra: {},
      visible: true,
    })
    await createBlock({
      collection: "advantage",
      title: `DragBlock B ${stamp}`,
      subtitle: "",
      body: "",
      image: "",
      icon: "",
      href: "",
      extra: {},
      visible: true,
    })
    const createdBlocks = (await getBlocks("advantage")).filter((block) =>
      [block.title, block.subtitle, block.body].some((text) => String(text).includes(String(stamp))),
    )
    assert.equal(createdBlocks.length, 2, "created two CMS blocks for drag reorder")
    const [blockA, blockB] = createdBlocks
    blockIds.push(blockA.id, blockB.id)

    const blockMax = (await getBlocks("advantage")).reduce((m, block) => Math.max(m, block.sortOrder), -1)
    await db.update(contentBlocks).set({ sortOrder: blockMax + 1 }).where(eq(contentBlocks.id, blockA.id))
    await db.update(contentBlocks).set({ sortOrder: blockMax + 2 }).where(eq(contentBlocks.id, blockB.id))

    const allBlocks = await getBlocks("advantage")
    const allBlockIds = allBlocks.map((block) => block.id)
    await reorderBlocks("advantage", [blockB.id, blockA.id, ...allBlockIds.filter((id) => id !== blockA.id && id !== blockB.id)])
    let blocks = (await getBlocks("advantage")).filter((block) => blockIds.includes(block.id))
    assert.deepEqual(blocks.map((block) => block.id), [blockB.id, blockA.id], "reorderBlocks moves B before A")
  } finally {
    for (const id of tourIds) {
      try {
        await purgeTour(id)
      } catch {
        /* ignore */
      }
    }
    for (const id of blockIds) {
      try {
        await deleteBlock(id)
      } catch {
        /* ignore */
      }
    }
    for (const id of cityIds) {
      try {
        await purgeCity(id)
      } catch {
        /* ignore */
      }
    }
    for (const id of countryIds) {
      try {
        await purgeCountry(id)
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

  console.log("ok")
}

if (!hasSelfcheckPostgres()) {
  console.log(skipRuntimeMessage("drag-sort-catalog.selfcheck.ts"))
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
