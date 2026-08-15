import { and, asc, count as countRows, eq, ne } from "drizzle-orm"
import { db, type DbExecutor } from "@/lib/db"
import { cityDestinations, tours } from "@/lib/db/schema"
import { ensureDb } from "@/lib/db/init"
import { slugify } from "@/lib/countries"
import { toArchivedSlug, stripArchivedSuffix } from "@/lib/archive-slug"
import { getSettings } from "@/lib/cms"
import type { CityDestination, CityCategory } from "@/lib/types"

export const CITY_ARCHIVE_BLOCKED_BY_TOURS =
  "Нельзя заархивировать, пока существуют активные туры в этом направлении"

function parseSections(value: string): CityDestination["sections"] {
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function mapCity(row: typeof cityDestinations.$inferSelect): CityDestination {
  const cat = (["bus", "avia", "hot"] as const).includes(row.category as CityCategory)
    ? (row.category as CityCategory)
    : "bus"
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: cat,
    country: row.country,
    countryId: row.countryId,
    intro: row.intro,
    sections: parseSections(row.sections),
    seoHtml: row.seoHtml,
    sortOrder: row.sortOrder,
    archived: row.archived,
  }
}

export async function getCityDestinations(category?: CityCategory): Promise<CityDestination[]> {
  await ensureDb()
  const rows = await db
    .select()
    .from(cityDestinations)
    .where(
      category
        ? and(eq(cityDestinations.category, category), eq(cityDestinations.archived, false))
        : eq(cityDestinations.archived, false),
    )
    .orderBy(asc(cityDestinations.sortOrder), asc(cityDestinations.id))
  return rows.map(mapCity)
}

export async function getArchivedCities(category?: CityCategory): Promise<CityDestination[]> {
  await ensureDb()
  const rows = await db
    .select()
    .from(cityDestinations)
    .where(
      category
        ? and(eq(cityDestinations.category, category), eq(cityDestinations.archived, true))
        : eq(cityDestinations.archived, true),
    )
    .orderBy(asc(cityDestinations.sortOrder), asc(cityDestinations.id))
  return rows.map(mapCity)
}

export async function getCityDestination(
  slug: string,
  category?: CityCategory,
): Promise<CityDestination | undefined> {
  await ensureDb()
  const where = category
    ? and(
        eq(cityDestinations.slug, slug),
        eq(cityDestinations.category, category),
        eq(cityDestinations.archived, false),
      )
    : and(eq(cityDestinations.slug, slug), eq(cityDestinations.archived, false))
  const [row] = await db.select().from(cityDestinations).where(where).limit(1)
  return row ? mapCity(row) : undefined
}

export async function getCityById(id: number): Promise<CityDestination | undefined> {
  await ensureDb()
  const [row] = await db.select().from(cityDestinations).where(eq(cityDestinations.id, id)).limit(1)
  return row ? mapCity(row) : undefined
}

export async function countCitiesByCountryId(countryId: number, category?: CityCategory): Promise<number> {
  await ensureDb()
  const [result] = await db
    .select({ count: countRows() })
    .from(cityDestinations)
    .where(
      category
        ? and(
            eq(cityDestinations.countryId, countryId),
            eq(cityDestinations.category, category),
            eq(cityDestinations.archived, false),
          )
        : and(eq(cityDestinations.countryId, countryId), eq(cityDestinations.archived, false)),
    )
  return result?.count ?? 0
}

// country -> [{ slug, name }] for the sidebar dropdowns, scoped to a category.
export async function getCitiesByCountry(
  category?: CityCategory,
  settings?: Record<string, string>,
): Promise<Record<string, { slug: string; name: string }[]>> {
  const [cities, vis] = await Promise.all([
    getCityDestinations(category),
    settings ? Promise.resolve(settings) : getSettings(),
  ])
  const visibleCities = cities.filter((c) => vis[`city:${c.category}:${c.slug}.visible`] !== "0")
  return visibleCities.reduce(
    (acc, c) => {
      ;(acc[c.country] ??= []).push({ slug: c.slug, name: c.name })
      return acc
    },
    {} as Record<string, { slug: string; name: string }[]>,
  )
}

/* ---------- Admin mutations ---------- */

export type CityInput = {
  slug: string
  name: string
  category: CityCategory
  country: string
  countryId: number
  intro: string
  sections: CityDestination["sections"]
  seoHtml: string
}

function serializeCity(input: CityInput) {
  return {
    slug: input.slug,
    name: input.name,
    category: input.category,
    country: input.country,
    countryId: input.countryId,
    intro: input.intro,
    sections: JSON.stringify(input.sections),
    seoHtml: input.seoHtml,
  }
}

export async function createCity(input: CityInput, executor: DbExecutor = db): Promise<number> {
  if (executor === db) await ensureDb()
  const [taken] = await executor.select({ id: cityDestinations.id }).from(cityDestinations).where(and(eq(cityDestinations.slug, input.slug), eq(cityDestinations.category, input.category), eq(cityDestinations.country, input.country))).limit(1)
  if (taken) {
    throw Object.assign(new Error(`Город со slug «${input.slug}» уже существует в этой стране/категории. Выберите другой slug.`), { code: "SLUG_EXISTS" })
  }
  const existing = await executor.select({ sortOrder: cityDestinations.sortOrder }).from(cityDestinations)
  const nextOrder = existing.reduce((max, r) => Math.max(max, r.sortOrder), -1) + 1
  const [row] = await executor
    .insert(cityDestinations)
    .values({ ...serializeCity(input), sortOrder: nextOrder, createdAt: Date.now() })
    .returning({ id: cityDestinations.id })
  return row.id
}

export async function updateCity(id: number, input: CityInput, executor: DbExecutor = db) {
  if (executor === db) await ensureDb()
  const [taken] = await executor.select({ id: cityDestinations.id }).from(cityDestinations).where(and(eq(cityDestinations.slug, input.slug), eq(cityDestinations.category, input.category), eq(cityDestinations.country, input.country), ne(cityDestinations.id, id))).limit(1)
  if (taken) {
    throw Object.assign(new Error(`Город со slug «${input.slug}» уже существует в этой стране/категории. Выберите другой slug.`), { code: "SLUG_EXISTS" })
  }
  await executor.update(cityDestinations).set(serializeCity(input)).where(eq(cityDestinations.id, id))
}

/** Swap sortOrder with neighbour in the same country group (admin accordion). */
export async function moveCity(id: number, direction: "up" | "down") {
  await ensureDb()
  const [current] = await db.select().from(cityDestinations).where(eq(cityDestinations.id, id)).limit(1)
  if (!current || current.archived) return
  const siblings = await db
    .select()
    .from(cityDestinations)
    .where(
      and(
        eq(cityDestinations.category, current.category),
        eq(cityDestinations.archived, false),
        eq(cityDestinations.country, current.country),
      ),
    )
    .orderBy(asc(cityDestinations.sortOrder), asc(cityDestinations.id))
  const index = siblings.findIndex((c) => c.id === id)
  const swapIndex = direction === "up" ? index - 1 : index + 1
  if (swapIndex < 0 || swapIndex >= siblings.length) return
  const neighbour = siblings[swapIndex]
  await db
    .update(cityDestinations)
    .set({ sortOrder: neighbour.sortOrder })
    .where(eq(cityDestinations.id, current.id))
  await db
    .update(cityDestinations)
    .set({ sortOrder: current.sortOrder })
    .where(eq(cityDestinations.id, neighbour.id))
}

/**
 * Apply a full or partial city order within a category.
 * Partial lists (one country accordion) replace only those slots in the global order.
 */
export async function reorderCities(orderedIds: number[]) {
  await ensureDb()
  const ids = Array.from(new Set(orderedIds.filter((id) => Number.isInteger(id) && id > 0)))
  if (ids.length < 2) return
  const first = ids[0]
  const [current] = await db.select().from(cityDestinations).where(eq(cityDestinations.id, first)).limit(1)
  if (!current || current.archived) return
  const siblings = await db
    .select({ id: cityDestinations.id })
    .from(cityDestinations)
    .where(and(eq(cityDestinations.category, current.category), eq(cityDestinations.archived, false)))
    .orderBy(asc(cityDestinations.sortOrder), asc(cityDestinations.id))
  const siblingIds = siblings.map((row) => row.id)
  const siblingSet = new Set(siblingIds)
  if (!ids.every((id) => siblingSet.has(id))) return
  const idSet = new Set(ids)
  const positions: number[] = []
  for (let i = 0; i < siblingIds.length; i++) {
    if (idSet.has(siblingIds[i])) positions.push(i)
  }
  if (positions.length !== ids.length) return
  const next = [...siblingIds]
  for (let i = 0; i < positions.length; i++) {
    next[positions[i]] = ids[i]
  }
  if (next.every((id, index) => id === siblingIds[index])) return
  await db.transaction(async (tx) => {
    for (const [sortOrder, id] of next.entries()) {
      await tx.update(cityDestinations).set({ sortOrder }).where(eq(cityDestinations.id, id))
    }
  })
}

export async function deleteCity(id: number) {
  await ensureDb()
  const [linked] = await db
    .select({ count: countRows() })
    .from(tours)
    .where(and(eq(tours.arrivalCityId, id), eq(tours.archived, false)))
  if ((linked?.count ?? 0) > 0) throw new Error(CITY_ARCHIVE_BLOCKED_BY_TOURS)

  const [row] = await db
    .select({ slug: cityDestinations.slug })
    .from(cityDestinations)
    .where(eq(cityDestinations.id, id))
    .limit(1)
  if (!row) return
  await db
    .update(cityDestinations)
    .set({ archived: true, slug: toArchivedSlug(row.slug) })
    .where(eq(cityDestinations.id, id))
}

export async function restoreCity(id: number) {
  await ensureDb()
  const [row] = await db
    .select({ slug: cityDestinations.slug })
    .from(cityDestinations)
    .where(eq(cityDestinations.id, id))
    .limit(1)
  if (!row) return
  await db
    .update(cityDestinations)
    .set({ archived: false, slug: stripArchivedSuffix(row.slug) })
    .where(eq(cityDestinations.id, id))
}

export async function purgeCity(id: number) {
  await ensureDb()
  const [linked] = await db
    .select({ count: countRows() })
    .from(tours)
    .where(eq(tours.arrivalCityId, id))
  if ((linked?.count ?? 0) > 0) {
    throw new Error("Нельзя удалить город навсегда, пока к нему привязаны туры (в т.ч. в архиве)")
  }
  await db.delete(cityDestinations).where(eq(cityDestinations.id, id))
}

// Find an arrival city by name within a category (case-insensitive) or create one.
// Cities are category-scoped, so the same name can exist for bus and avia separately.
export async function ensureCity(
  name: string,
  country = "",
  countryId = 0,
  category: CityCategory = "bus",
): Promise<{ id: number; name: string }> {
  await ensureDb()
  const trimmed = name.trim()
  const trimmedCountry = country.trim()
  if (!trimmed || !trimmedCountry) return { id: 0, name: "" }
  const all = await db.select().from(cityDestinations).where(eq(cityDestinations.category, category))
  const found = all.find((c) => c.name.trim().toLowerCase() === trimmed.toLowerCase())
  if (found) return { id: found.id, name: found.name }
  // Slug is unique per category, so the same slug may exist in other categories.
  const slug = slugify(trimmed)

  const id = await createCity({
    slug,
    name: trimmed,
    category,
    country: trimmedCountry,
    countryId,
    intro: "",
    sections: [],
    seoHtml: "",
  })
  return { id, name: trimmed }
}
