/**
 * #70: reassign seed tours off sticky «Тестовый город QA», then archive→purge city.
 *
 * Dry-run (default): npx tsx "./scripts/reassign-sticky-qa-city.ts"
 * Apply:            npx tsx "./scripts/reassign-sticky-qa-city.ts" --apply
 */
import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { eq, like, or } from "drizzle-orm"

function loadEnvLocal() {
  const p = path.join(process.cwd(), ".env.local")
  if (!existsSync(p)) return
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (!m) continue
    let val = m[2]!
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    process.env[m[1]!] ??= val
  }
}

/** Seed tour destinations (bus countries 4/5/6 on live Turso). */
const TOUR_TARGETS: {
  id: number
  cityName: string
  countryId: number
  country: string
}[] = [
  { id: 6, cityName: "Хургада", countryId: 4, country: "Египет" },
  { id: 7, cityName: "Шарм-эль-Шейх", countryId: 4, country: "Египет" },
  { id: 8, cityName: "Дубай", countryId: 5, country: "ОАЭ" },
  { id: 9, cityName: "Анталия", countryId: 6, country: "Турция" },
  { id: 10, cityName: "Хургада", countryId: 4, country: "Египет" },
  { id: 11, cityName: "Анталия", countryId: 6, country: "Турция" },
  { id: 12, cityName: "Дубай", countryId: 5, country: "ОАЭ" },
]

const STICKY_SLUG = "testovyy-gorod-qa"
const STICKY_NAME = "Тестовый город QA"

async function main() {
  loadEnvLocal()
  const apply = process.argv.includes("--apply")
  const { ensureDb } = await import("../lib/db/init")
  const { db } = await import("../lib/db")
  const { cityDestinations, tours, settings } = await import("../lib/db/schema")
  const { ensureCity, deleteCity, purgeCity } = await import("../lib/cities")

  await ensureDb()
  console.log(`mode=${apply ? "APPLY" : "dry-run"}`)

  const stickyRows = await db
    .select()
    .from(cityDestinations)
    .where(
      or(eq(cityDestinations.slug, STICKY_SLUG), eq(cityDestinations.name, STICKY_NAME)),
    )
  if (!stickyRows.length) {
    console.log("sticky city already gone — nothing to do")
    return
  }
  const sticky = stickyRows[0]!
  console.log(`sticky city #${sticky.id} ${sticky.name} (${sticky.slug})`)

  const linked = await db
    .select({
      id: tours.id,
      title: tours.title,
      slug: tours.slug,
      countryId: tours.countryId,
      country: tours.country,
      arrivalCityId: tours.arrivalCityId,
    })
    .from(tours)
    .where(eq(tours.arrivalCityId, sticky.id))
  console.log(`linked tours: ${linked.length}`)
  for (const t of linked) console.log(`  #${t.id} ${t.slug} country=${t.countryId}:${t.country}`)

  const cityCache = new Map<string, number>()
  async function cityIdFor(name: string, country: string, countryId: number) {
    const key = `${countryId}:${name}`
    const hit = cityCache.get(key)
    if (hit) return hit
    const ensured = await ensureCity(name, country, countryId, "bus")
    if (!ensured.id) throw new Error(`ensureCity failed for ${name}`)
    cityCache.set(key, ensured.id)
    return ensured.id
  }

  for (const target of TOUR_TARGETS) {
    const tour = linked.find((t) => t.id === target.id)
    if (!tour) {
      console.log(`skip tour #${target.id}: not linked to sticky (ok if already moved)`)
      continue
    }
    if (!apply) {
      console.log(
        `would reassign tour #${target.id} → country ${target.countryId}:${target.country} city ${target.cityName}`,
      )
      continue
    }
    const newCityId = await cityIdFor(target.cityName, target.country, target.countryId)
    console.log(
      `tour #${target.id} → country ${target.countryId}:${target.country} city ${newCityId}:${target.cityName}`,
    )
    await db
      .update(tours)
      .set({
        countryId: target.countryId,
        country: target.country,
        arrivalCityId: newCityId,
      })
      .where(eq(tours.id, target.id))
  }

  const still = await db
    .select({ id: tours.id, title: tours.title })
    .from(tours)
    .where(eq(tours.arrivalCityId, sticky.id))
  if (still.length && apply) {
    throw new Error(
      `still linked after reassign: ${still.map((t) => `#${t.id} ${t.title}`).join("; ")}`,
    )
  }
  if (still.length && !apply) {
    console.log(`dry-run: would still see ${still.length} linked until --apply`)
  }

  const settingKeys = await db
    .select({ key: settings.key })
    .from(settings)
    .where(like(settings.key, `city:bus:${STICKY_SLUG}%`))
  console.log(`settings keys for sticky: ${settingKeys.length}`)
  for (const row of settingKeys) console.log(`  ${row.key}`)

  if (apply) {
    for (const row of settingKeys) {
      await db.delete(settings).where(eq(settings.key, row.key))
      console.log(`settings deleted: ${row.key}`)
    }
    if (!sticky.archived) await deleteCity(sticky.id)
    await purgeCity(sticky.id)
    console.log(`city purged: #${sticky.id}`)

    const gone = await db
      .select({ id: cityDestinations.id })
      .from(cityDestinations)
      .where(
        or(eq(cityDestinations.slug, STICKY_SLUG), eq(cityDestinations.name, STICKY_NAME)),
      )
    if (gone.length) throw new Error("sticky city still present after purge")
    console.log("verify: sticky city gone")
  } else {
    console.log("dry-run complete — re-run with --apply to mutate Turso")
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
