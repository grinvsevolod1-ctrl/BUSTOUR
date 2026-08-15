import { and, asc, count as countRows, desc, eq, inArray, like, ne, notInArray } from "drizzle-orm"
import { db, type DbExecutor } from "@/lib/db"
import { tours, buses, transfers, transferSchedules, reviews, articles, leads, countries, cityDestinations, staff, certSections, certificates, contentBlocks, tourDates, tourDateTags, tourDateRooms, settings } from "@/lib/db/schema"
import { ensureDb } from "@/lib/db/init"
import { isArticleCategory, type Bus, type Transfer, type TransferCategory, type TransferDirection, type TransferSchedule, type Tour, type Review, type Article, type ArticleCategory, type Lead, type StaffMember, type DatesTable, type CertSection, type Certificate, type CertSectionWithItems } from "@/lib/types"
import { parseAlertKind } from "@/lib/alert-kind"
import { getArchivedCities } from "@/lib/cities"
import { getArchivedCountries } from "@/lib/countries"
import {
  coerceDatesTable,
  deriveDuration,
  deriveNights,
  datesTableRangeError,
  emptyDatesTable,
  minTablePrice,
  upcomingRows,
} from "@/lib/dates-table"
import { getHiddenTourSlugs } from "@/lib/cms"
import { formatMoney } from "@/lib/currencies"
import { toArchivedSlug, stripArchivedSuffix } from "@/lib/archive-slug"
import {
  coerceMediaNode,
  coerceMediaNodeList,
  serializeMediaNode,
  serializeMediaNodeList,
  type MediaNode,
} from "@/lib/media/node"
import { toPublicReview } from "@/lib/review-utils"
import { parseJson, mapTour, assembleDatesTables, type DatesTourMeta } from "./_shared"
import { computeSwapUpdates, type MoveDirection } from "./move"

type ListToursOpts = {
  /** Soft-delete filter. Default: false (live). */
  archived?: boolean
  category?: string
  featured?: boolean
  /** Extra slug exclusions (e.g. current tour on related). */
  excludeSlugs?: string[]
  /** Exclude CMS-hidden tours (`tour:slug.visible=0`). */
  excludeHidden?: boolean
  limit?: number
  /** Featured first, then newest — for home expand grid. */
  featuredFirst?: boolean
}

/** Core tour listing: filter in SQL, then assemble dates only for the result set. */

async function listTours(opts: ListToursOpts = {}): Promise<Tour[]> {
  await ensureDb()
  const archived = opts.archived ?? false
  const conditions = [eq(tours.archived, archived)]
  if (opts.category) conditions.push(eq(tours.category, opts.category))
  if (opts.featured !== undefined) conditions.push(eq(tours.featured, opts.featured))

  const exclude = new Set(opts.excludeSlugs?.filter(Boolean) ?? [])
  if (opts.excludeHidden) {
    for (const slug of await getHiddenTourSlugs()) exclude.add(slug)
  }
  if (exclude.size) conditions.push(notInArray(tours.slug, [...exclude]))

  const orderBy = opts.featuredFirst
    ? [desc(tours.featured), asc(tours.sortOrder), asc(tours.id)]
    : [asc(tours.sortOrder), asc(tours.id)]

  let query = db
    .select({ tour: tours, countrySlug: countries.slug, citySlug: cityDestinations.slug })
    .from(tours)
    .leftJoin(countries, eq(tours.countryId, countries.id))
    .leftJoin(cityDestinations, eq(tours.arrivalCityId, cityDestinations.id))
    .where(and(...conditions))
    .orderBy(...orderBy)

  const rows = opts.limit != null ? await query.limit(opts.limit) : await query
  const dates = await assembleDatesTables(rows.map((row) => row.tour))
  return rows.map((row) =>
    mapTour(row.tour, dates.get(row.tour.id) ?? emptyDatesTable, {
      countrySlug: row.countrySlug,
      citySlug: row.citySlug,
    }, true),
  )
}

export async function getTours(): Promise<Tour[]> {
  return listTours()
}

/** Public/sitemap: non-archived and CMS-visible (`tour:slug.visible` ≠ 0). */
export async function getVisibleTours(): Promise<Tour[]> {
  return listTours({ excludeHidden: true })
}

/** Bus tours for review linking (admin). */
export async function getBusTours(): Promise<Tour[]> {
  return listTours({ category: "bus" })
}

export async function getArchivedTours(): Promise<Tour[]> {
  return listTours({ archived: true })
}

export async function getFeaturedTours(limit = 4): Promise<Tour[]> {
  const featured = await listTours({ featured: true, excludeHidden: true, limit })
  if (featured.length >= limit) return featured
  const fill = await listTours({
    excludeHidden: true,
    excludeSlugs: featured.map((t) => t.slug),
    limit: limit - featured.length,
  })
  return [...featured, ...fill]
}

/** Featured first, then other visible tours — for home expand grid. */
export async function getHomeTourOffers(): Promise<Tour[]> {
  return listTours({ excludeHidden: true, featuredFirst: true })
}

export async function getBusToursWithDates(): Promise<Tour[]> {
  return listTours({ category: "bus", excludeHidden: true })
}

export async function getTour(slug: string): Promise<Tour | undefined> {
  await ensureDb()
  const [row] = await db
    .select({ tour: tours, countrySlug: countries.slug, citySlug: cityDestinations.slug })
    .from(tours)
    .leftJoin(countries, eq(tours.countryId, countries.id))
    .leftJoin(cityDestinations, eq(tours.arrivalCityId, cityDestinations.id))
    .where(and(eq(tours.slug, slug), eq(tours.archived, false)))
    .limit(1)
  if (!row) return undefined
  const dates = await assembleDatesTables([row.tour])
  return mapTour(
    row.tour,
    dates.get(row.tour.id) ?? emptyDatesTable,
    { countrySlug: row.countrySlug, citySlug: row.citySlug },
    true,
  )
}

/** Live or archived — preflight UNIQUE slug before insert/update. */
export async function findTourIdBySlug(slug: string): Promise<number | undefined> {
  await ensureDb()
  const [row] = await db.select({ id: tours.id }).from(tours).where(eq(tours.slug, slug)).limit(1)
  return row?.id
}

export async function getRelatedTours(slug: string, limit = 4): Promise<Tour[]> {
  return listTours({ excludeHidden: true, excludeSlugs: [slug], limit })
}

/* ---------- Reviews ---------- */


export type TourInput = {
  slug: string
  title: string
  description: string
  price: string
  priceAmount: number
  extraPriceAmount: number
  extraPriceCurrency: string
  datesCurrency: string
  image: string
  tourType: string
  duration: string
  departure: string
  country: string
  countryId: number
  arrivalCityId: number
  nights: number
  featured: boolean
  program: Tour["program"]
  included: string[]
  excluded: string[]
  whatIncluded: Tour["whatIncluded"]
  seoHtml: string
  seoTitle: string
  alertText: string
  alertType: Tour["alertType"]
  gallery: MediaNode[]
  datesTable?: Tour["datesTable"]
  documents: Tour["documents"]
  layout: Tour["layout"]
}

function serializeTour(input: TourInput) {
  const cover = coerceMediaNode(input.image) ?? { url: input.image }
  return {
    slug: input.slug,
    title: input.title,
    description: input.description,
    price: input.price,
    priceAmount: input.priceAmount,
    extraPriceAmount: input.extraPriceAmount,
    extraPriceCurrency: input.extraPriceCurrency,
    datesCurrency: input.datesCurrency,
    image: serializeMediaNode(cover),
    category: "bus",
    tourType: input.tourType,
    duration: input.duration,
    departure: input.departure,
    country: input.country,
    countryId: input.countryId,
    arrivalCityId: input.arrivalCityId,
    nights: input.nights,
    featured: input.featured,
    program: JSON.stringify(input.program),
    included: JSON.stringify(input.included),
    excluded: JSON.stringify(input.excluded),
    whatIncluded: JSON.stringify(input.whatIncluded),
    seoHtml: input.seoHtml,
    seoTitle: input.seoTitle,
    alertText: input.alertText,
    alertType: input.alertType,
    gallery: serializeMediaNodeList(input.gallery),
    documents: JSON.stringify(input.documents),
    layout: JSON.stringify(input.layout),
  }
}

export async function createTour(input: TourInput): Promise<number> {
  await ensureDb()
  const existing = await db.select({ sortOrder: tours.sortOrder }).from(tours)
  const nextOrder = existing.reduce((max, row) => Math.max(max, row.sortOrder), -1) + 1
  const [row] = await db
    .insert(tours)
    .values({ ...serializeTour(input), sortOrder: nextOrder, createdAt: Date.now() })
    .returning({ id: tours.id })
  return row.id
}

export async function updateTour(id: number, input: TourInput) {
  await ensureDb()
  await db.update(tours).set(serializeTour(input)).where(eq(tours.id, id))
}

/** Swap sortOrder with neighbour in the same country group (admin accordion). */
export async function moveTour(id: number, direction: MoveDirection) {
  await ensureDb()
  const [current] = await db.select().from(tours).where(eq(tours.id, id)).limit(1)
  if (!current || current.archived) return
  const siblings = await db
    .select()
    .from(tours)
    .where(
      and(
        eq(tours.category, current.category),
        eq(tours.archived, false),
        eq(tours.country, current.country),
      ),
    )
    .orderBy(asc(tours.sortOrder), asc(tours.id))
  const updates = computeSwapUpdates(siblings, id, direction)
  if (updates.length === 0) return
  await db.transaction(async (tx) => {
    for (const u of updates) {
      await tx.update(tours).set({ sortOrder: u.sortOrder }).where(eq(tours.id, u.id))
    }
  })
}

/**
 * Apply a full or partial tour order within a category.
 * Partial lists (one country accordion) replace only those slots in the global order.
 */
export async function reorderTours(orderedIds: number[]) {
  await ensureDb()
  const ids = Array.from(new Set(orderedIds.filter((id) => Number.isInteger(id) && id > 0)))
  if (ids.length < 2) return
  const first = ids[0]
  const [current] = await db.select().from(tours).where(eq(tours.id, first)).limit(1)
  if (!current || current.archived) return
  const siblings = await db
    .select({ id: tours.id })
    .from(tours)
    .where(and(eq(tours.category, current.category), eq(tours.archived, false)))
    .orderBy(asc(tours.sortOrder), asc(tours.id))
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
      await tx.update(tours).set({ sortOrder }).where(eq(tours.id, id))
    }
  })
}

export async function deleteTour(id: number) {
  await ensureDb()
  const [row] = await db.select({ slug: tours.slug }).from(tours).where(eq(tours.id, id)).limit(1)
  if (!row) return
  await db
    .update(tours)
    .set({ archived: true, slug: toArchivedSlug(row.slug) })
    .where(eq(tours.id, id))
}

export async function restoreTour(id: number) {
  await ensureDb()
  const [row] = await db.select({ slug: tours.slug }).from(tours).where(eq(tours.id, id)).limit(1)
  if (!row) return
  const liveSlug = stripArchivedSuffix(row.slug)
  const [taken] = await db
    .select({ id: tours.id })
    .from(tours)
    .where(and(eq(tours.slug, liveSlug), ne(tours.id, id)))
    .limit(1)
  if (taken) {
    const err = new Error(`Slug «${liveSlug}» уже занят — нельзя восстановить`) as Error & { code: string }
    err.code = "SLUG_EXISTS"
    throw err
  }
  await db
    .update(tours)
    .set({ archived: false, slug: liveSlug })
    .where(eq(tours.id, id))
}

export async function purgeTour(id: number) {
  await ensureDb()
  const dateRows = await db.select({ id: tourDates.id }).from(tourDates).where(eq(tourDates.tourId, id))
  const dateIds = dateRows.map((d) => d.id)
  if (dateIds.length) {
    await db.delete(tourDateTags).where(inArray(tourDateTags.dateId, dateIds))
    await db.delete(tourDateRooms).where(inArray(tourDateRooms.dateId, dateIds))
  }
  await db.delete(tourDates).where(eq(tourDates.tourId, id))
  const [row] = await db.select({ slug: tours.slug }).from(tours).where(eq(tours.id, id)).limit(1)
  if (row) {
    const baseSlug = stripArchivedSuffix(row.slug)
    await db.delete(settings).where(like(settings.key, `tour:${baseSlug}%`))
  }
  await db.delete(tours).where(eq(tours.id, id))
}

export async function countToursByCountryId(countryId: number): Promise<number> {
  await ensureDb()
  const [result] = await db
    .select({ count: countRows() })
    .from(tours)
    .where(and(eq(tours.countryId, countryId), eq(tours.archived, false)))
  return result?.count ?? 0
}

export async function countToursByCityId(cityId: number): Promise<number> {
  await ensureDb()
  const [result] = await db
    .select({ count: countRows() })
    .from(tours)
    .where(and(eq(tours.arrivalCityId, cityId), eq(tours.archived, false)))
  return result?.count ?? 0
}

export async function getTourById(id: number): Promise<Tour | undefined> {
  await ensureDb()
  const [row] = await db
    .select({ tour: tours, countrySlug: countries.slug, citySlug: cityDestinations.slug })
    .from(tours)
    .leftJoin(countries, eq(tours.countryId, countries.id))
    .leftJoin(cityDestinations, eq(tours.arrivalCityId, cityDestinations.id))
    .where(eq(tours.id, id))
    .limit(1)
  if (!row) return undefined
  const dates = await assembleDatesTables([row.tour])
  return mapTour(row.tour, dates.get(row.tour.id) ?? emptyDatesTable, { countrySlug: row.countrySlug, citySlug: row.citySlug }, false)
}

function cleanIsoDate(value: unknown): string {
  const text = String(value ?? "").trim()
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : ""
}

export async function saveTourDatesTable(tourId: number, table: DatesTable): Promise<void> {
  await ensureDb()
  const normalized = coerceDatesTable(table)
  const rangeError = datesTableRangeError(normalized)
  if (rangeError) throw new Error(rangeError)
  await db.transaction(async (tx) => {
    await tx.update(tours).set({
      datesNote: normalized.note.trim(),
      datesNoteType: parseAlertKind(normalized.noteType),
      datesCurrency: normalized.currency.trim() || "BYN",
      datesFootnotes: JSON.stringify(normalized.footnotes),
    }).where(eq(tours.id, tourId))
    const existing = await tx.select({ id: tourDates.id }).from(tourDates).where(eq(tourDates.tourId, tourId))
    const dateIds = existing.map((date) => date.id)
    if (dateIds.length) {
      await tx.delete(tourDateTags).where(inArray(tourDateTags.dateId, dateIds))
      await tx.delete(tourDateRooms).where(inArray(tourDateRooms.dateId, dateIds))
    }
    await tx.delete(tourDates).where(eq(tourDates.tourId, tourId))
    let dateOrder = 0
    for (const row of normalized.rows) {
      const startDate = cleanIsoDate(row.startDate)
      const endDate = cleanIsoDate(row.endDate)
      if (!startDate && !endDate) continue
      const inserted = await tx.insert(tourDates).values({
        tourId,
        startDate,
        endDate,
        description: row.description.trim(),
        extraPriceAmount: Math.max(0, Number(row.extraPriceAmount) || 0),
        extraPriceCurrency: (row.extraPriceCurrency ?? "").trim().toUpperCase(),
        sortOrder: dateOrder++,
        createdAt: Date.now(),
      }).returning({ id: tourDates.id })
      const dateId = inserted[0]?.id
      if (!dateId) continue
      let tagOrder = 0
      for (const tag of row.tags) {
        const icon = tag.icon.trim()
        const label = tag.label.trim()
        if (!icon && !label) continue
        await tx.insert(tourDateTags).values({ dateId, icon: icon || "flag", label, sortOrder: tagOrder++ })
      }
      let roomOrder = 0
      for (const room of row.rooms) {
        const name = room.name.trim()
        const price = Math.max(0, Number(room.price) || 0)
        const discount = Math.min(100, Math.max(0, Math.round(Number(room.discount) || 0)))
        if (!name && price === 0 && discount === 0) continue
        await tx.insert(tourDateRooms).values({ dateId, name, price, discount, sortOrder: roomOrder++ })
      }
    }
  })
}

/* ---------- Admin mutations: Reviews ---------- */

