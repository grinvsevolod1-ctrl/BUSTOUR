import { and, asc, count as countRows, eq, ne } from "drizzle-orm"
import { db, type DbExecutor } from "@/lib/db"
import { countries, cityDestinations, tours } from "@/lib/db/schema"
import { ensureDb } from "@/lib/db/init"
import type { Country } from "@/lib/types"
import { slugify } from "@/lib/slug"
import { toArchivedSlug, stripArchivedSuffix } from "@/lib/archive-slug"
import { computeSwapUpdates, type MoveDirection } from "@/lib/queries/move"

export const COUNTRY_ARCHIVE_BLOCKED_BY_TOURS =
  "Нельзя заархивировать, пока существуют активные туры в этом направлении"

export { slugify } from "@/lib/slug"

export type AviaCountryEntry = {
  id: number
  name: string
  slug: string
  cities: { name: string; slug: string }[]
}

function mapCountry(row: typeof countries.$inferSelect): Country {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: (row.category === "avia" ? "avia" : row.category === "hot" ? "hot" : "bus") as "bus" | "avia" | "hot",
    intro: row.intro,
    seoHtml: row.seoHtml,
    sortOrder: row.sortOrder,
    archived: row.archived,
  }
}

export async function getCountries(category?: "bus" | "avia" | "hot"): Promise<Country[]> {
  await ensureDb()
  const rows = category
    ? await db
        .select()
        .from(countries)
        .where(and(eq(countries.category, category), eq(countries.archived, false)))
        .orderBy(asc(countries.sortOrder), asc(countries.id))
    : await db
        .select()
        .from(countries)
        .where(eq(countries.archived, false))
        .orderBy(asc(countries.sortOrder), asc(countries.id))
  return rows.map(mapCountry)
}

export async function getArchivedCountries(category?: "bus" | "avia" | "hot"): Promise<Country[]> {
  await ensureDb()
  const rows = category
    ? await db
        .select()
        .from(countries)
        .where(and(eq(countries.category, category), eq(countries.archived, true)))
        .orderBy(asc(countries.sortOrder), asc(countries.id))
    : await db
        .select()
        .from(countries)
        .where(eq(countries.archived, true))
        .orderBy(asc(countries.sortOrder), asc(countries.id))
  return rows.map(mapCountry)
}

export async function getCountry(slug: string, category: "bus" | "avia" | "hot"): Promise<Country | undefined> {
  await ensureDb()
  const [row] = await db
    .select()
    .from(countries)
    .where(and(eq(countries.slug, slug), eq(countries.category, category), eq(countries.archived, false)))
    .limit(1)
  return row ? mapCountry(row) : undefined
}

export async function getCountryById(id: number): Promise<Country | undefined> {
  await ensureDb()
  const [row] = await db.select().from(countries).where(eq(countries.id, id)).limit(1)
  return row ? mapCountry(row) : undefined
}

/* ---------- Admin mutations ---------- */

export type CountryInput = {
  slug: string
  name: string
  category: "bus" | "avia" | "hot"
  intro: string
  seoHtml: string
}

export async function createCountry(input: CountryInput, executor: DbExecutor = db): Promise<number> {
  if (executor === db) await ensureDb()
  const slug = input.slug || slugify(input.name)
  // Check for slug conflict before inserting
  const [conflict] = await executor.select({ id: countries.id, category: countries.category }).from(countries).where(and(eq(countries.slug, slug), eq(countries.category, input.category))).limit(1)
  if (conflict) {
    throw Object.assign(new Error(`Страна со slug «${slug}» уже существует в этом разделе. Выберите другой slug.`), { code: "SLUG_EXISTS" })
  }
  const existing = await executor.select({ sortOrder: countries.sortOrder }).from(countries)
  const nextOrder = existing.reduce((max, r) => Math.max(max, r.sortOrder), -1) + 1
  const [row] = await executor
    .insert(countries)
    .values({
      slug,
      name: input.name,
      category: input.category,
      intro: input.intro,
      seoHtml: input.seoHtml,
      sortOrder: nextOrder,
      createdAt: Date.now(),
    })
    .returning({ id: countries.id })
  return row.id
}

export async function updateCountry(id: number, input: CountryInput, executor: DbExecutor = db) {
  if (executor === db) await ensureDb()
  const [taken] = await executor
    .select({ id: countries.id })
    .from(countries)
    .where(and(eq(countries.slug, input.slug || slugify(input.name)), eq(countries.category, input.category), ne(countries.id, id)))
    .limit(1)
  if (taken) {
    throw Object.assign(new Error(`Страна со slug «${input.slug || slugify(input.name)}» уже существует в этом разделе. Выберите другой slug.`), { code: "SLUG_EXISTS" })
  }
  await executor
    .update(countries)
    .set({ slug: input.slug || slugify(input.name), name: input.name, category: input.category, intro: input.intro, seoHtml: input.seoHtml })
    .where(eq(countries.id, id))
}

/** Swap sortOrder with neighbour in the same category (active list). Normalizes duplicate orders. */
export async function moveCountry(id: number, direction: MoveDirection) {
  await ensureDb()
  const [current] = await db.select().from(countries).where(eq(countries.id, id)).limit(1)
  if (!current || current.archived) return
  const siblings = await db
    .select()
    .from(countries)
    .where(and(eq(countries.category, current.category), eq(countries.archived, false)))
    .orderBy(asc(countries.sortOrder), asc(countries.id))
  const updates = computeSwapUpdates(siblings, id, direction)
  if (updates.length === 0) return
  await db.transaction(async (tx) => {
    for (const u of updates) {
      await tx.update(countries).set({ sortOrder: u.sortOrder }).where(eq(countries.id, u.id))
    }
  })
}

export async function reorderCountries(orderedIds: number[]) {
  await ensureDb()
  const ids = Array.from(new Set(orderedIds.filter((id) => Number.isInteger(id) && id > 0)))
  if (ids.length < 2) return
  const first = ids[0]
  const [current] = await db.select().from(countries).where(eq(countries.id, first)).limit(1)
  if (!current || current.archived) return
  const siblings = await db
    .select({ id: countries.id })
    .from(countries)
    .where(and(eq(countries.category, current.category), eq(countries.archived, false)))
    .orderBy(asc(countries.sortOrder), asc(countries.id))
  if (siblings.length !== ids.length) return
  const siblingIds = siblings.map((row) => row.id)
  const siblingSet = new Set(siblingIds)
  if (!ids.every((id) => siblingSet.has(id))) return
  if (ids.every((id, index) => id === siblingIds[index])) return
  await db.transaction(async (tx) => {
    for (const [sortOrder, id] of ids.entries()) {
      await tx.update(countries).set({ sortOrder }).where(eq(countries.id, id))
    }
  })
}

export async function deleteCountry(id: number) {
  await ensureDb()
  const [linked] = await db
    .select({ count: countRows() })
    .from(tours)
    .where(and(eq(tours.countryId, id), eq(tours.archived, false)))
  if ((linked?.count ?? 0) > 0) throw new Error(COUNTRY_ARCHIVE_BLOCKED_BY_TOURS)

  const [row] = await db.select({ slug: countries.slug }).from(countries).where(eq(countries.id, id)).limit(1)
  if (!row) return
  await db
    .update(countries)
    .set({ archived: true, slug: toArchivedSlug(row.slug) })
    .where(eq(countries.id, id))
}

export async function restoreCountry(id: number) {
  await ensureDb()
  const [row] = await db.select({ slug: countries.slug }).from(countries).where(eq(countries.id, id)).limit(1)
  if (!row) return
  await db
    .update(countries)
    .set({ archived: false, slug: stripArchivedSuffix(row.slug) })
    .where(eq(countries.id, id))
}

export async function purgeCountry(id: number) {
  await ensureDb()
  const [tourLinked] = await db
    .select({ count: countRows() })
    .from(tours)
    .where(eq(tours.countryId, id))
  if ((tourLinked?.count ?? 0) > 0) {
    throw new Error("Нельзя удалить страну навсегда, пока к ней привязаны туры (в т.ч. в архиве)")
  }
  const [cityLinked] = await db
    .select({ count: countRows() })
    .from(cityDestinations)
    .where(eq(cityDestinations.countryId, id))
  if ((cityLinked?.count ?? 0) > 0) {
    throw new Error("Нельзя удалить страну навсегда, пока к ней привязаны города")
  }
  await db.delete(countries).where(eq(countries.id, id))
}

// Returns all countries with category='avia', ordered by sortOrder.
// Also attaches any avia city_destinations linked to each country (optional — sidebar
// shows only the country link when no cities exist yet).
export async function getAviaCountries(settings?: Record<string, string>): Promise<AviaCountryEntry[]> {
  await ensureDb()
  const [aviaCountries, aviaCities] = await Promise.all([
    db
      .select()
      .from(countries)
      .where(and(eq(countries.category, "avia"), eq(countries.archived, false)))
      .orderBy(asc(countries.sortOrder), asc(countries.id)),
    db
      .select({ id: cityDestinations.id, name: cityDestinations.name, slug: cityDestinations.slug, countryId: cityDestinations.countryId })
      .from(cityDestinations)
      .where(and(eq(cityDestinations.category, "avia"), eq(cityDestinations.archived, false)))
      .orderBy(asc(cityDestinations.sortOrder), asc(cityDestinations.id)),
  ])

  const citiesByCountryId = aviaCities
    .filter((c) => !settings || settings[`city:avia:${c.slug}.visible`] !== "0")
    .reduce(
      (acc, c) => {
        ;(acc[c.countryId] ??= []).push({ name: c.name, slug: c.slug })
        return acc
      },
      {} as Record<number, { name: string; slug: string }[]>,
    )

  return aviaCountries
    .filter((c) => !settings || settings[`country:${c.category}:${c.slug}.visible`] !== "0")
    .map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      cities: citiesByCountryId[c.id] ?? [],
    }))
}

export async function getCountrySlugs(category?: "bus" | "avia" | "hot"): Promise<Record<string, string>> {
  await ensureDb()
  const rows = category
    ? await db
        .select({ name: countries.name, slug: countries.slug })
        .from(countries)
        .where(and(eq(countries.category, category), eq(countries.archived, false)))
        .orderBy(asc(countries.sortOrder), asc(countries.id))
    : await db
        .select({ name: countries.name, slug: countries.slug })
        .from(countries)
        .where(eq(countries.archived, false))
        .orderBy(asc(countries.sortOrder), asc(countries.id))
  // Object key insertion order preserves sortOrder for visibleCountryNames / sidebar
  return Object.fromEntries(rows.map((r) => [r.name, r.slug]))
}

/** Country display names whose CMS visibility is on (missing key = visible). */
export function visibleCountryNames(
  countrySlugs: Record<string, string>,
  settings: Record<string, string>,
  category: "bus" | "avia" | "hot",
): string[] {
  return Object.entries(countrySlugs)
    .filter(([, slug]) => settings[`country:${category}:${slug}.visible`] !== "0")
    .map(([name]) => name)
}

// Find a country by name (case-insensitive) or create it. Returns its id.
export async function ensureCountry(name: string, category: "bus" | "avia" | "hot" = "bus"): Promise<{ id: number; name: string }> {
  await ensureDb()
  const trimmed = name.trim()
  if (!trimmed) throw new Error("Страна обязательна")
  const all = await db.select().from(countries).where(eq(countries.category, category))
  const found = all.find((c) => c.name.trim().toLowerCase() === trimmed.toLowerCase())
  if (found) return { id: found.id, name: found.name }
  const id = await createCountry({ slug: slugify(trimmed), name: trimmed, category, intro: "", seoHtml: "" })
  return { id, name: trimmed }
}
