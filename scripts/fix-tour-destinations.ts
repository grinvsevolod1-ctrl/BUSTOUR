/**
 * One-shot: link tours with arrivalCityId=0 to bus cities (create if needed),
 * purge junk cities/countries that break URLs.
 *
 * Run: npx tsx scripts/fix-tour-destinations.ts
 */
import assert from "node:assert/strict"
import { createClient } from "@libsql/client"
import path from "node:path"
import { slugify } from "@/lib/countries"

type CityNeed = { name: string; slug: string; countryId: number }

const NEEDS: CityNeed[] = [
  { name: "Москва", slug: "moskva", countryId: 1 },
  { name: "Хургада", slug: "hurgada", countryId: 4 },
  { name: "Шарм-эль-Шейх", slug: "sharm-el-sheikh", countryId: 5 }, // wait Egypt is 4
]

async function main() {
  const c = createClient({ url: `file:${path.join(process.cwd(), "data", "app.db")}` })
  const now = Date.now()

  async function ensureBusCity(name: string, countryId: number, countryName: string): Promise<number> {
    const existing = await c.execute({
      sql: `SELECT id FROM city_destinations WHERE countryId = ? AND category = 'bus' AND archived = 0 AND lower(name) = lower(?) LIMIT 1`,
      args: [countryId, name],
    })
    if (existing.rows[0]) return existing.rows[0].id as number

    const slugBase = slugify(name)
    let slug = slugBase
    let n = 0
    for (;;) {
      const clash = await c.execute({
        sql: `SELECT id FROM city_destinations WHERE slug = ? AND category = 'bus' LIMIT 1`,
        args: [slug],
      })
      if (!clash.rows[0]) break
      n += 1
      slug = `${slugBase}-${n}`
    }

    const maxOrder = await c.execute(
      `SELECT COALESCE(MAX(sortOrder), -1) AS m FROM city_destinations`,
    )
    const sortOrder = Number(maxOrder.rows[0]?.m ?? -1) + 1
    const inserted = await c.execute({
      sql: `INSERT INTO city_destinations (slug, name, category, country, countryId, intro, sections, seoHtml, sortOrder, archived, createdAt)
            VALUES (?, ?, 'bus', ?, ?, '', '[]', '', ?, 0, ?)`,
      args: [slug, name, countryName, countryId, sortOrder, now],
    })
    return Number(inserted.lastInsertRowid)
  }

  const countryName = async (id: number) => {
    const r = await c.execute({ sql: `SELECT name FROM countries WHERE id = ?`, args: [id] })
    return String(r.rows[0]?.name ?? "")
  }

  // Tour → city name under its countryId
  const tourCity: Record<number, string> = {
    2: "Москва",
    3: "Карелия",
    4: "Кавказ",
    5: "Вильнюс",
    6: "Хургада",
    7: "Шарм-эль-Шейх",
    8: "Дубай",
    9: "Анталия",
    10: "Хургада",
    12: "Дубай",
  }

  for (const [tourIdRaw, cityName] of Object.entries(tourCity)) {
    const tourId = Number(tourIdRaw)
    const tour = await c.execute({
      sql: `SELECT id, countryId, arrivalCityId, title FROM tours WHERE id = ?`,
      args: [tourId],
    })
    const row = tour.rows[0]
    if (!row) continue
    if (Number(row.arrivalCityId) > 0) continue
    const countryId = Number(row.countryId)
    assert.ok(countryId > 0, `tour ${tourId} has no country`)
    const cname = await countryName(countryId)
    assert.ok(cname, `country ${countryId} missing`)
    const cityId = await ensureBusCity(cityName, countryId, cname)
    await c.execute({
      sql: `UPDATE tours SET arrivalCityId = ? WHERE id = ?`,
      args: [cityId, tourId],
    })
    console.log(`tour ${tourId} → city ${cityId} (${cityName})`)
  }

  // Soft-archive junk cities unused by active tours
  const junk = await c.execute(
    `SELECT id, slug, name FROM city_destinations WHERE archived = 0 AND (name IN ('1', '1231231231') OR slug IN ('1', '1231231231'))`,
  )
  for (const city of junk.rows) {
    const linked = await c.execute({
      sql: `SELECT COUNT(*) AS n FROM tours WHERE arrivalCityId = ? AND archived = 0`,
      args: [city.id as number],
    })
    if (Number(linked.rows[0]?.n ?? 0) > 0) {
      console.log("skip junk city in use", city)
      continue
    }
    await c.execute({
      sql: `UPDATE city_destinations SET archived = 1, slug = ? WHERE id = ?`,
      args: [`${city.slug}-archived-${now}`, city.id as number],
    })
    console.log("archived junk city", city)
  }

  // Soft-archive junk country
  const junkCountries = await c.execute(
    `SELECT id, slug, name FROM countries WHERE archived = 0 AND lower(name) IN ('пизда')`,
  )
  for (const country of junkCountries.rows) {
    const linkedCities = await c.execute({
      sql: `SELECT COUNT(*) AS n FROM city_destinations WHERE countryId = ? AND archived = 0`,
      args: [country.id as number],
    })
    const linkedTours = await c.execute({
      sql: `SELECT COUNT(*) AS n FROM tours WHERE countryId = ? AND archived = 0`,
      args: [country.id as number],
    })
    if (Number(linkedCities.rows[0]?.n ?? 0) + Number(linkedTours.rows[0]?.n ?? 0) > 0) {
      console.log("skip junk country in use", country)
      continue
    }
    await c.execute({
      sql: `UPDATE countries SET archived = 1, slug = ? WHERE id = ?`,
      args: [`${country.slug}-archived-${now}`, country.id as number],
    })
    console.log("archived junk country", country)
  }

  // Verify no live tours without destination
  const bad = await c.execute(
    `SELECT id, slug, title, countryId, arrivalCityId FROM tours WHERE archived = 0 AND (countryId = 0 OR arrivalCityId = 0)`,
  )
  assert.equal(bad.rows.length, 0, `still broken tours: ${JSON.stringify(bad.rows)}`)
  console.log("fix-tour-destinations: ok")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
