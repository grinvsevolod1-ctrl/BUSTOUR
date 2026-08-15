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
} from "@/lib/media-node"
import { toPublicReview } from "@/lib/review-utils"

function parseJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

type DatesTourMeta = {
  id: number
  datesNote: string
  datesNoteType: string
  datesCurrency: string
  datesFootnotes: string | null
}

function parseStoredFootnotes(raw: string | null | undefined): string[] | undefined {
  if (raw == null || raw === "") return undefined
  try {
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? parsed.map((line) => String(line ?? "")) : undefined
  } catch {
    return undefined
  }
}

export async function assembleDatesTables(tourRows: DatesTourMeta[]): Promise<Map<number, DatesTable>> {
  const result = new Map<number, DatesTable>()
  for (const row of tourRows) {
    result.set(
      row.id,
      coerceDatesTable({
        note: row.datesNote ?? "",
        noteType: parseAlertKind(row.datesNoteType),
        currency: row.datesCurrency || "BYN",
        footnotes: parseStoredFootnotes(row.datesFootnotes),
        rows: [],
      }),
    )
  }
  const tourIds = tourRows.map((row) => row.id)
  if (!tourIds.length) return result

  const dateRows = await db
    .select()
    .from(tourDates)
    .where(inArray(tourDates.tourId, tourIds))
    .orderBy(asc(tourDates.tourId), asc(tourDates.sortOrder), asc(tourDates.id))
  const dateIds = dateRows.map((row) => row.id)
  const [tags, rooms] = dateIds.length
    ? await Promise.all([
        db.select().from(tourDateTags).where(inArray(tourDateTags.dateId, dateIds)).orderBy(asc(tourDateTags.dateId), asc(tourDateTags.sortOrder), asc(tourDateTags.id)),
        db.select().from(tourDateRooms).where(inArray(tourDateRooms.dateId, dateIds)).orderBy(asc(tourDateRooms.dateId), asc(tourDateRooms.sortOrder), asc(tourDateRooms.id)),
      ])
    : [[], []]
  const tagsByDate = new Map<number, typeof tags>()
  const roomsByDate = new Map<number, typeof rooms>()
  for (const tag of tags) (tagsByDate.get(tag.dateId) ?? (tagsByDate.set(tag.dateId, []), tagsByDate.get(tag.dateId)!)).push(tag)
  for (const room of rooms) (roomsByDate.get(room.dateId) ?? (roomsByDate.set(room.dateId, []), roomsByDate.get(room.dateId)!)).push(room)
  for (const date of dateRows) {
    const table = result.get(date.tourId)
    if (!table) continue
    table.rows.push({
      id: date.id,
      startDate: date.startDate,
      endDate: date.endDate,
      description: date.description,
      extraPriceAmount: date.extraPriceAmount,
      extraPriceCurrency: date.extraPriceCurrency,
      tags: (tagsByDate.get(date.id) ?? []).map((tag) => ({ id: tag.id, icon: tag.icon, label: tag.label })),
      rooms: (roomsByDate.get(date.id) ?? []).map((room) => ({ id: room.id, name: room.name, price: room.price, discount: room.discount })),
    })
  }
  return result
}

function mapTour(
  row: typeof tours.$inferSelect,
  datesTable: DatesTable,
  extra?: { countrySlug?: string | null; citySlug?: string | null },
  fillFromDates = false,
): Tour {
  // Prefer upcoming departures for listing price/duration (past rows stay in admin only).
  const firstDatedRow = fillFromDates
    ? upcomingRows(datesTable.rows).find((date) => !!deriveDuration(date.startDate, date.endDate))
    : undefined
  // Corner-cut: tours-listing price conversion assumes datesTable.currency matches the base currency.
  const derivedPriceAmount = fillFromDates ? minTablePrice(datesTable) : 0
  const priceAmount = !row.priceAmount && derivedPriceAmount ? derivedPriceAmount : row.priceAmount
  const price = !row.priceAmount && derivedPriceAmount ? formatMoney(derivedPriceAmount, datesTable.currency) : row.price
  const duration = !row.duration.trim() && firstDatedRow ? deriveDuration(firstDatedRow.startDate, firstDatedRow.endDate) : row.duration
  const nights = !row.nights && firstDatedRow ? deriveNights(firstDatedRow.startDate, firstDatedRow.endDate) : row.nights
  const cover = coerceMediaNode(row.image) ?? { url: row.image || "" }
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    price,
    priceAmount,
    extraPriceAmount: row.extraPriceAmount,
    extraPriceCurrency: row.extraPriceCurrency,
    datesCurrency: row.datesCurrency || "BYN",
    image: cover.url,
    cover,
    tourType: row.tourType,
    duration,
    departure: row.departure,
    country: row.country,
    countryId: row.countryId,
    countrySlug: extra?.countrySlug ?? "",
    arrivalCityId: row.arrivalCityId,
    citySlug: extra?.citySlug ?? "",
    nights,
    featured: row.featured,
    sortOrder: row.sortOrder,
    program: parseJson(row.program, [] as Tour["program"]),
    included: parseJson(row.included, [] as string[]),
    excluded: parseJson(row.excluded, [] as string[]),
    whatIncluded: parseJson(row.whatIncluded, [] as Tour["whatIncluded"]),
    seoHtml: row.seoHtml,
    seoTitle: row.seoTitle,
    alertText: row.alertText,
    alertType: parseAlertKind(row.alertType),
    gallery: coerceMediaNodeList(row.gallery),
    datesTable,
    documents: parseJson(row.documents, [] as Tour["documents"]),
    layout: parseJson(row.layout, [] as Tour["layout"]),
    archived: row.archived,
  }
}

function mapBus(row: typeof buses.$inferSelect): Bus {
  const cover = coerceMediaNode(row.image) ?? { url: row.image || "" }
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    image: cover.url,
    cover,
    gallery: coerceMediaNodeList(row.gallery),
    year: row.year,
    seats: row.seats,
    busClass: row.busClass,
    phone: row.phone,
    documents: parseJson(row.documents, [] as Bus["documents"]),
    seating: parseJson(row.seating, [] as Bus["seating"]),
    sortOrder: row.sortOrder,
    archived: row.archived,
  }
}

export async function getBuses(): Promise<Bus[]> {
  await ensureDb()
  const rows = await db
    .select()
    .from(buses)
    .where(eq(buses.archived, false))
    .orderBy(asc(buses.sortOrder), asc(buses.id))
  return rows.map(mapBus)
}

export async function getArchivedBuses(): Promise<Bus[]> {
  await ensureDb()
  const rows = await db
    .select()
    .from(buses)
    .where(eq(buses.archived, true))
    .orderBy(asc(buses.sortOrder), asc(buses.id))
  return rows.map(mapBus)
}

export async function getBus(slug: string): Promise<Bus | undefined> {
  await ensureDb()
  const [row] = await db
    .select()
    .from(buses)
    .where(and(eq(buses.slug, slug), eq(buses.archived, false)))
    .limit(1)
  return row ? mapBus(row) : undefined
}

export async function getBusById(id: number): Promise<Bus | undefined> {
  await ensureDb()
  const [row] = await db.select().from(buses).where(eq(buses.id, id)).limit(1)
  return row ? mapBus(row) : undefined
}

export type BusInput = {
  slug: string
  title: string
  image: string
  gallery: MediaNode[]
  year: string
  seats: string
  busClass: string
  phone: string
  documents: Bus["documents"]
  seating: Bus["seating"]
}

function serializeBus(input: BusInput) {
  const cover = coerceMediaNode(input.image) ?? { url: input.image }
  return {
    slug: input.slug,
    title: input.title,
    image: serializeMediaNode(cover),
    gallery: serializeMediaNodeList(input.gallery),
    year: input.year,
    seats: input.seats,
    busClass: input.busClass,
    phone: input.phone,
    documents: JSON.stringify(input.documents),
    seating: JSON.stringify(input.seating),
  }
}

export async function createBus(input: BusInput, executor: DbExecutor = db): Promise<number> {
  if (executor === db) await ensureDb()
  const existing = await executor.select({ sortOrder: buses.sortOrder }).from(buses)
  const nextOrder = existing.reduce((max, row) => Math.max(max, row.sortOrder), -1) + 1
  const [row] = await executor
    .insert(buses)
    .values({ ...serializeBus(input), sortOrder: nextOrder, createdAt: Date.now() })
    .returning({ id: buses.id })
  return row.id
}

export async function updateBus(id: number, input: BusInput, executor: DbExecutor = db) {
  if (executor === db) await ensureDb()
  await executor.update(buses).set(serializeBus(input)).where(eq(buses.id, id))
}

/** Swap sortOrder with neighbour in the active fleet list. */
export async function moveBus(id: number, direction: "up" | "down") {
  await ensureDb()
  const [current] = await db.select().from(buses).where(eq(buses.id, id)).limit(1)
  if (!current || current.archived) return
  const siblings = await db
    .select()
    .from(buses)
    .where(eq(buses.archived, false))
    .orderBy(asc(buses.sortOrder), asc(buses.id))
  const index = siblings.findIndex((b) => b.id === id)
  const swapIndex = direction === "up" ? index - 1 : index + 1
  if (swapIndex < 0 || swapIndex >= siblings.length) return
  const neighbour = siblings[swapIndex]
  await db.update(buses).set({ sortOrder: neighbour.sortOrder }).where(eq(buses.id, current.id))
  await db.update(buses).set({ sortOrder: current.sortOrder }).where(eq(buses.id, neighbour.id))
}

export async function deleteBus(id: number) {
  await ensureDb()
  const [row] = await db.select({ slug: buses.slug }).from(buses).where(eq(buses.id, id)).limit(1)
  if (!row) return
  await db
    .update(buses)
    .set({ archived: true, slug: toArchivedSlug(row.slug) })
    .where(eq(buses.id, id))
}

export async function restoreBus(id: number) {
  await ensureDb()
  const [row] = await db.select({ slug: buses.slug }).from(buses).where(eq(buses.id, id)).limit(1)
  if (!row) return
  const liveSlug = stripArchivedSuffix(row.slug)
  const [taken] = await db
    .select({ id: buses.id })
    .from(buses)
    .where(and(eq(buses.slug, liveSlug), ne(buses.id, id)))
    .limit(1)
  if (taken) {
    const err = new Error(`Slug «${liveSlug}» уже занят — нельзя восстановить`) as Error & { code: string }
    err.code = "SLUG_EXISTS"
    throw err
  }
  await db
    .update(buses)
    .set({ archived: false, slug: liveSlug })
    .where(eq(buses.id, id))
}

/** Hard-delete bus + settings / FAQ / resort blocks keyed by live slug. */
export async function purgeBus(id: number) {
  await ensureDb()
  const [row] = await db.select({ slug: buses.slug }).from(buses).where(eq(buses.id, id)).limit(1)
  if (!row) return
  const baseSlug = stripArchivedSuffix(row.slug)
  const pageKey = `bus:${baseSlug}`
  await db.delete(settings).where(like(settings.key, `${pageKey}%`))
  await db.delete(contentBlocks).where(eq(contentBlocks.page, pageKey))
  await db.delete(buses).where(eq(buses.id, id))
}

function mapTransfer(row: typeof transfers.$inferSelect): Transfer {
  return {
    id: row.id,
    slug: row.slug,
    category: row.category === "individual" ? "individual" : "airport",
    title: row.title,
    intro: row.intro,
    priceRoundTrip: row.priceRoundTrip,
    priceOneWay: row.priceOneWay,
    image: row.image,
    sortOrder: row.sortOrder,
    archived: row.archived,
  }
}

export async function getTransfers(category?: TransferCategory): Promise<Transfer[]> {
  await ensureDb()
  const rows = await db
    .select()
    .from(transfers)
    .where(
      category
        ? and(eq(transfers.category, category), eq(transfers.archived, false))
        : eq(transfers.archived, false),
    )
    .orderBy(asc(transfers.category), asc(transfers.sortOrder), asc(transfers.id))
  return rows.map(mapTransfer)
}

export async function getArchivedTransfers(): Promise<Transfer[]> {
  await ensureDb()
  const rows = await db
    .select()
    .from(transfers)
    .where(eq(transfers.archived, true))
    .orderBy(asc(transfers.category), asc(transfers.sortOrder), asc(transfers.id))
  return rows.map(mapTransfer)
}

export async function getTransfer(slug: string, category?: TransferCategory): Promise<Transfer | undefined> {
  await ensureDb()
  const where = category
    ? and(eq(transfers.slug, slug), eq(transfers.category, category), eq(transfers.archived, false))
    : and(eq(transfers.slug, slug), eq(transfers.archived, false))
  const [row] = await db.select().from(transfers).where(where).limit(1)
  return row ? mapTransfer(row) : undefined
}

export async function getTransferById(id: number): Promise<Transfer | undefined> {
  await ensureDb()
  const [row] = await db.select().from(transfers).where(eq(transfers.id, id)).limit(1)
  return row ? mapTransfer(row) : undefined
}

export type TransferInput = {
  slug: string
  category: TransferCategory
  title: string
  intro: string
  priceRoundTrip: number
  priceOneWay: number
  image: string
}

export async function createTransfer(input: TransferInput, executor: DbExecutor = db): Promise<number> {
  if (executor === db) await ensureDb()
  const existing = await executor.select({ sortOrder: transfers.sortOrder }).from(transfers)
  const nextOrder = existing.reduce((max, row) => Math.max(max, row.sortOrder), -1) + 1
  const [row] = await executor.insert(transfers).values({
    ...input,
    sortOrder: nextOrder,
    createdAt: Date.now(),
  }).returning({ id: transfers.id })
  return row.id
}

export async function updateTransfer(id: number, input: TransferInput, executor: DbExecutor = db) {
  if (executor === db) await ensureDb()
  await executor.update(transfers).set(input).where(eq(transfers.id, id))
}

export async function deleteTransfer(id: number) {
  await ensureDb()
  const [row] = await db.select({ slug: transfers.slug }).from(transfers).where(eq(transfers.id, id)).limit(1)
  if (!row) return
  await db
    .update(transfers)
    .set({ archived: true, slug: toArchivedSlug(row.slug) })
    .where(eq(transfers.id, id))
}

export async function restoreTransfer(id: number) {
  await ensureDb()
  const [row] = await db.select({ slug: transfers.slug }).from(transfers).where(eq(transfers.id, id)).limit(1)
  if (!row) return
  const liveSlug = stripArchivedSuffix(row.slug)
  const [taken] = await db
    .select({ id: transfers.id })
    .from(transfers)
    .where(and(eq(transfers.slug, liveSlug), ne(transfers.id, id)))
    .limit(1)
  if (taken) {
    const err = new Error(`Slug «${liveSlug}» уже занят — нельзя восстановить`) as Error & { code: string }
    err.code = "SLUG_EXISTS"
    throw err
  }
  await db
    .update(transfers)
    .set({ archived: false, slug: liveSlug })
    .where(eq(transfers.id, id))
}

export async function purgeTransfer(id: number) {
  await ensureDb()
  await db.delete(transferSchedules).where(eq(transferSchedules.transferId, id))
  await db.delete(transfers).where(eq(transfers.id, id))
}

function mapTransferSchedule(row: typeof transferSchedules.$inferSelect): TransferSchedule {
  return {
    id: row.id,
    transferId: row.transferId,
    direction: row.direction === "return" ? "return" : "outbound",
    departureTime: row.departureTime,
    arrival: row.arrival,
    note: row.note,
    bookingHref: row.bookingHref,
    sortOrder: row.sortOrder,
  }
}

export async function getTransferSchedules(
  transferId: number,
  direction?: TransferDirection,
): Promise<TransferSchedule[]> {
  await ensureDb()
  const where = direction
    ? and(eq(transferSchedules.transferId, transferId), eq(transferSchedules.direction, direction))
    : eq(transferSchedules.transferId, transferId)
  const rows = await db
    .select()
    .from(transferSchedules)
    .where(where)
    .orderBy(asc(transferSchedules.direction), asc(transferSchedules.sortOrder), asc(transferSchedules.id))
  return rows.map(mapTransferSchedule)
}

export async function replaceTransferSchedules(
  transferId: number,
  direction: TransferDirection,
  rows: Omit<TransferSchedule, "id" | "transferId" | "direction" | "sortOrder">[],
) {
  await ensureDb()
  await db.transaction(async (tx) => {
    await tx.delete(transferSchedules).where(
      and(
        eq(transferSchedules.transferId, transferId),
        eq(transferSchedules.direction, direction),
      ),
    )
    if (rows.length) {
      await tx.insert(transferSchedules).values(
        normalizeTransferScheduleRows(rows).map((row, sortOrder) => ({
          transferId,
          direction,
          departureTime: row.departureTime,
          arrival: row.arrival,
          note: row.note,
          bookingHref: row.bookingHref,
          sortOrder,
          createdAt: Date.now(),
        })),
      )
    }
  })
}

export function normalizeTransferScheduleRows(
  rows: Array<{
    departureTime?: unknown
    arrival?: unknown
    note?: unknown
    bookingHref?: unknown
  }>,
) {
  return rows.map((row) => ({
    departureTime: String(row.departureTime ?? "").trim(),
    arrival: String(row.arrival ?? "").trim(),
    note: String(row.note ?? "").trim(),
    bookingHref: String(row.bookingHref ?? "").trim(),
  }))
}

function mapArticle(row: typeof articles.$inferSelect): Article {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    category: isArticleCategory(row.category) ? row.category : "news",
    excerpt: row.excerpt,
    image: row.image,
    date: row.date,
    content: parseJson(row.content, [] as string[]),
    contentHtml: row.contentHtml,
    metaTitle: row.metaTitle,
    metaDescription: row.metaDescription,
    metaShortDesc: row.metaShortDesc,
    metaImage: row.metaImage,
    metaImageAlt: row.metaImageAlt,
    archived: row.archived,
  }
}

/* ---------- Tours ---------- */

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

function mapReview(r: typeof reviews.$inferSelect): Review {
  return {
    id: r.id,
    type: (r.type === "VIDEO" ? "VIDEO" : "TEXT") as Review["type"],
    name: r.name,
    tour: r.tour,
    text: r.text,
    rating: r.rating,
    source: (r.source === "holiday_by" ? "holiday_by" : "manual") as Review["source"],
    sourceId: r.sourceId,
    sourceDate: r.sourceDate,
    approved: r.approved,
    showOn: parseJson(r.showOn, [] as string[]),
    videoUrl: r.videoUrl ?? "",
    thumbnailUrl: r.thumbnailUrl ?? "",
    archived: r.archived,
    createdAt: r.createdAt,
  }
}

export async function getReviews(): Promise<Review[]> {
  await ensureDb()
  const rows = await db
    .select()
    .from(reviews)
    .where(eq(reviews.archived, false))
    .orderBy(desc(reviews.createdAt))
  return rows.map(mapReview)
}

export async function getArchivedReviews(): Promise<Review[]> {
  await ensureDb()
  const rows = await db
    .select()
    .from(reviews)
    .where(eq(reviews.archived, true))
    .orderBy(desc(reviews.createdAt))
  return rows.map(mapReview)
}

// Only approved reviews shown on site, optionally filtered by showOn page key and/or STI type.
export async function getApprovedReviews(showOnKey?: string, type?: Review["type"]): Promise<Review[]> {
  await ensureDb()
  const rows = await db
    .select()
    .from(reviews)
    .where(and(eq(reviews.approved, true), eq(reviews.archived, false)))
    .orderBy(desc(reviews.createdAt))
  let all = rows.map(mapReview).map(toPublicReview)
  if (showOnKey) all = all.filter((r) => !r.showOn.length || r.showOn.includes(showOnKey))
  if (type) all = all.filter((r) => r.type === type)
  return all
}

// Reviews tied to a specific tour (matched by the stored tour title).
export async function getReviewsByTour(title: string): Promise<Review[]> {
  await ensureDb()
  const rows = await db
    .select()
    .from(reviews)
    .where(and(eq(reviews.tour, title), eq(reviews.archived, false), eq(reviews.approved, true)))
    .orderBy(desc(reviews.createdAt))
  return rows
    .map(mapReview)
    .map(toPublicReview)
    .filter((r) => !r.showOn.length || r.showOn.includes("tour"))
}

/* ---------- Articles ---------- */

export async function getArticles(): Promise<Article[]> {
  await ensureDb()
  const rows = await db
    .select()
    .from(articles)
    .where(eq(articles.archived, false))
    .orderBy(desc(articles.createdAt))
  return rows.map(mapArticle)
}

export async function getArchivedArticles(): Promise<Article[]> {
  await ensureDb()
  const rows = await db
    .select()
    .from(articles)
    .where(eq(articles.archived, true))
    .orderBy(desc(articles.createdAt))
  return rows.map(mapArticle)
}

/** Aggregated archive for admin «Архив». */
export async function getArchivedPages() {
  const [
    tourRows,
    articleRows,
    cityRows,
    countryRows,
    busRows,
    reviewRows,
    staffRows,
    transferRows,
    leadRows,
  ] = await Promise.all([
    getArchivedTours(),
    getArchivedArticles(),
    getArchivedCities(),
    getArchivedCountries(),
    getArchivedBuses(),
    getArchivedReviews(),
    getArchivedStaff(),
    getArchivedTransfers(),
    getArchivedLeads(),
  ])
  return {
    tours: tourRows,
    articles: articleRows,
    cities: cityRows,
    countries: countryRows,
    buses: busRows,
    reviews: reviewRows,
    staff: staffRows,
    transfers: transferRows,
    leads: leadRows,
  }
}

export async function getArticle(slug: string): Promise<Article | undefined> {
  await ensureDb()
  const [row] = await db
    .select()
    .from(articles)
    .where(and(eq(articles.slug, slug), eq(articles.archived, false)))
    .limit(1)
  return row ? mapArticle(row) : undefined
}

/** Live or archived — preflight UNIQUE slug before insert/update. */
export async function findArticleIdBySlug(slug: string): Promise<number | undefined> {
  await ensureDb()
  const [row] = await db.select({ id: articles.id }).from(articles).where(eq(articles.slug, slug)).limit(1)
  return row?.id
}

/* ---------- Leads ---------- */

export async function createLead(input: {
  name: string
  phone: string
  email?: string | null
  message?: string | null
  type: Lead["type"]
  tour?: string | null
}): Promise<Lead> {
  await ensureDb()
  const [row] = await db
    .insert(leads)
    .values({
      name: input.name,
      phone: input.phone,
      email: input.email ?? null,
      message: input.message ?? null,
      type: input.type,
      tour: input.tour ?? null,
      status: "new",
      createdAt: Date.now(),
    })
    .returning()
  return row as Lead
}

export async function getLeads(): Promise<Lead[]> {
  await ensureDb()
  const rows = await db
    .select()
    .from(leads)
    .where(eq(leads.archived, false))
    .orderBy(desc(leads.createdAt))
  return rows as Lead[]
}

export async function getArchivedLeads(): Promise<Lead[]> {
  await ensureDb()
  const rows = await db
    .select()
    .from(leads)
    .where(eq(leads.archived, true))
    .orderBy(desc(leads.createdAt))
  return rows as Lead[]
}

export async function updateLeadStatus(id: number, status: Lead["status"]) {
  await ensureDb()
  await db.update(leads).set({ status }).where(eq(leads.id, id))
}

export async function deleteLead(id: number) {
  await ensureDb()
  await db.update(leads).set({ archived: true }).where(eq(leads.id, id))
}

export async function restoreLead(id: number) {
  await ensureDb()
  await db.update(leads).set({ archived: false }).where(eq(leads.id, id))
}

export async function purgeLead(id: number) {
  await ensureDb()
  await db.delete(leads).where(eq(leads.id, id))
}

/* ---------- Admin mutations: Tours ---------- */

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
export async function moveTour(id: number, direction: "up" | "down") {
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
  const index = siblings.findIndex((t) => t.id === id)
  const swapIndex = direction === "up" ? index - 1 : index + 1
  if (swapIndex < 0 || swapIndex >= siblings.length) return
  const neighbour = siblings[swapIndex]
  await db.update(tours).set({ sortOrder: neighbour.sortOrder }).where(eq(tours.id, current.id))
  await db.update(tours).set({ sortOrder: current.sortOrder }).where(eq(tours.id, neighbour.id))
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

export type ReviewInput = {
  type: Review["type"]
  name: string
  tour: string
  text: string
  rating: number
  videoUrl?: string
  thumbnailUrl?: string
  source?: string
  sourceId?: string
  sourceDate?: string
  approved?: boolean
  showOn?: string[]
}

export async function createReview(input: ReviewInput) {
  await ensureDb()
  await db.insert(reviews).values({
    type: input.type,
    name: input.name,
    tour: input.tour,
    text: input.text,
    rating: input.rating,
    source: input.source ?? "manual",
    sourceId: input.sourceId ?? "",
    sourceDate: input.sourceDate?.trim() || new Date().toISOString().slice(0, 10),
    approved: input.approved ?? false,
    showOn: JSON.stringify(input.showOn ?? []),
    videoUrl: input.videoUrl ?? "",
    thumbnailUrl: input.thumbnailUrl ?? "",
    createdAt: Date.now(),
  })
}

export async function getReviewById(id: number): Promise<Review | undefined> {
  await ensureDb()
  const rows = await db.select().from(reviews).where(eq(reviews.id, id)).limit(1)
  const row = rows[0]
  return row ? mapReview(row) : undefined
}

export async function updateReview(id: number, input: ReviewInput) {
  await ensureDb()
  // Do not wipe approved/showOn when omitted (admin form only edits content fields).
  const patch: {
    type: Review["type"]
    name: string
    tour: string
    text: string
    rating: number
    videoUrl: string
    thumbnailUrl: string
    approved?: boolean
    showOn?: string
  } = {
    type: input.type,
    name: input.name,
    tour: input.tour,
    text: input.text,
    rating: input.rating,
    videoUrl: input.videoUrl ?? "",
    thumbnailUrl: input.thumbnailUrl ?? "",
  }
  if (input.approved !== undefined) patch.approved = input.approved
  if (input.showOn !== undefined) patch.showOn = JSON.stringify(input.showOn)
  await db.update(reviews).set(patch).where(eq(reviews.id, id))
}

export async function approveReview(id: number, approved: boolean) {
  await ensureDb()
  await db.update(reviews).set({ approved }).where(eq(reviews.id, id))
}

export async function setReviewShowOn(id: number, showOn: string[]) {
  await ensureDb()
  await db.update(reviews).set({ showOn: JSON.stringify(showOn) }).where(eq(reviews.id, id))
}

export async function deleteReview(id: number) {
  await ensureDb()
  await db.update(reviews).set({ archived: true }).where(eq(reviews.id, id))
}

export async function restoreReview(id: number) {
  await ensureDb()
  await db.update(reviews).set({ archived: false }).where(eq(reviews.id, id))
}

export async function purgeReview(id: number) {
  await ensureDb()
  await db.delete(reviews).where(eq(reviews.id, id))
}

/* ---------- Admin mutations: Articles ---------- */

export type ArticleInput = {
  slug: string
  title: string
  category: ArticleCategory
  excerpt: string
  image: string
  date: string
  content: string[]
  contentHtml: string
  metaTitle: string
  metaDescription: string
  metaShortDesc: string
  metaImage: string
  metaImageAlt: string
}

export async function createArticle(input: ArticleInput) {
  await ensureDb()
  await db.insert(articles).values({
    slug: input.slug,
    title: input.title,
    category: input.category,
    excerpt: input.excerpt,
    image: input.image,
    date: input.date,
    content: JSON.stringify(input.content),
    contentHtml: input.contentHtml,
    metaTitle: input.metaTitle,
    metaDescription: input.metaDescription,
    metaShortDesc: input.metaShortDesc,
    metaImage: input.metaImage,
    metaImageAlt: input.metaImageAlt,
    createdAt: Date.now(),
  })
}

export async function updateArticle(id: number, input: ArticleInput) {
  await ensureDb()
  await db
    .update(articles)
    .set({
      slug: input.slug,
      title: input.title,
      category: input.category,
      excerpt: input.excerpt,
      image: input.image,
      date: input.date,
      content: JSON.stringify(input.content),
      contentHtml: input.contentHtml,
      metaTitle: input.metaTitle,
      metaDescription: input.metaDescription,
      metaShortDesc: input.metaShortDesc,
      metaImage: input.metaImage,
      metaImageAlt: input.metaImageAlt,
    })
    .where(eq(articles.id, id))
}

export async function updateArticleBase(id: number, input: ArticleInput) {
  await ensureDb()
  await db
    .update(articles)
    .set({
      slug: input.slug,
      title: input.title,
      category: input.category,
      excerpt: input.excerpt,
      image: input.image,
      date: input.date,
      metaTitle: input.metaTitle,
      metaDescription: input.metaDescription,
      metaShortDesc: input.metaShortDesc,
      metaImage: input.metaImage,
      metaImageAlt: input.metaImageAlt,
    })
    .where(eq(articles.id, id))
}

export async function deleteArticle(id: number) {
  await ensureDb()
  const [row] = await db.select({ slug: articles.slug }).from(articles).where(eq(articles.id, id)).limit(1)
  if (!row) return
  await db
    .update(articles)
    .set({ archived: true, slug: toArchivedSlug(row.slug) })
    .where(eq(articles.id, id))
}

export async function restoreArticle(id: number) {
  await ensureDb()
  const [row] = await db.select({ slug: articles.slug }).from(articles).where(eq(articles.id, id)).limit(1)
  if (!row) return
  const liveSlug = stripArchivedSuffix(row.slug)
  const [taken] = await db
    .select({ id: articles.id })
    .from(articles)
    .where(and(eq(articles.slug, liveSlug), ne(articles.id, id)))
    .limit(1)
  if (taken) {
    const err = new Error(`Slug «${liveSlug}» уже занят — нельзя восстановить`) as Error & { code: string }
    err.code = "SLUG_EXISTS"
    throw err
  }
  await db
    .update(articles)
    .set({ archived: false, slug: liveSlug })
    .where(eq(articles.id, id))
}

export async function purgeArticle(id: number) {
  await ensureDb()
  await db.delete(articles).where(eq(articles.id, id))
}

export async function getArticleById(id: number): Promise<Article | undefined> {
  await ensureDb()
  const [row] = await db.select().from(articles).where(eq(articles.id, id)).limit(1)
  return row ? mapArticle(row) : undefined
}

/* ---------- Slug maps for URL building ---------- */

/**
 * Returns lookup maps { id -> slug } for countries and city destinations.
 * Used by listing pages to build canonical tour URLs for <TourCard>.
 */
export async function getSlugMaps(): Promise<{
  countrySlugById: Record<number, string>
  citySlugById: Record<number, string>
  cityNameById: Record<number, string>
}> {
  await ensureDb()
  const [countryRows, cityRows] = await Promise.all([
    db.select({ id: countries.id, slug: countries.slug }).from(countries),
    db.select({ id: cityDestinations.id, slug: cityDestinations.slug, name: cityDestinations.name }).from(cityDestinations),
  ])
  return {
    countrySlugById: Object.fromEntries(countryRows.map((r) => [r.id, r.slug])),
    citySlugById: Object.fromEntries(cityRows.map((r) => [r.id, r.slug])),
    cityNameById: Object.fromEntries(cityRows.map((r) => [r.id, r.name])),
  }
}

/* ---------- Staff ---------- */

function mapStaff(row: typeof staff.$inferSelect): StaffMember {
  return {
    id: row.id,
    name: row.name,
    position: row.position,
    email: row.email,
    phone: row.phone,
    photo: row.photo,
    sortOrder: row.sortOrder,
    archived: row.archived,
    createdAt: row.createdAt,
  }
}

export async function getStaff(): Promise<StaffMember[]> {
  await ensureDb()
  const rows = await db
    .select()
    .from(staff)
    .where(eq(staff.archived, false))
    .orderBy(asc(staff.sortOrder), asc(staff.createdAt))
  return rows.map(mapStaff)
}

export async function getArchivedStaff(): Promise<StaffMember[]> {
  await ensureDb()
  const rows = await db
    .select()
    .from(staff)
    .where(eq(staff.archived, true))
    .orderBy(asc(staff.sortOrder), asc(staff.createdAt))
  return rows.map(mapStaff)
}

export async function getStaffMember(id: number): Promise<StaffMember | undefined> {
  await ensureDb()
  const [row] = await db.select().from(staff).where(eq(staff.id, id)).limit(1)
  return row ? mapStaff(row) : undefined
}

export type StaffInput = {
  name: string
  position: string
  email: string
  phone: string
  photo: string
  sortOrder: number
}

export async function createStaffMember(input: StaffInput) {
  await ensureDb()
  await db.insert(staff).values({ ...input, createdAt: Date.now() })
}

export async function updateStaffMember(id: number, input: StaffInput) {
  await ensureDb()
  await db.update(staff).set(input).where(eq(staff.id, id))
}

export async function deleteStaffMember(id: number) {
  await ensureDb()
  await db.update(staff).set({ archived: true }).where(eq(staff.id, id))
}

export async function restoreStaffMember(id: number) {
  await ensureDb()
  await db.update(staff).set({ archived: false }).where(eq(staff.id, id))
}

export async function purgeStaffMember(id: number) {
  await ensureDb()
  await db.delete(staff).where(eq(staff.id, id))
}

/* ---------- Cert Sections & Certificates ---------- */

function mapCertSection(row: typeof certSections.$inferSelect): CertSection {
  return {
    id: row.id,
    title: row.title,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt,
  }
}

function mapCertificate(row: typeof certificates.$inferSelect): Certificate {
  return {
    id: row.id,
    sectionId: row.sectionId,
    name: row.name,
    description: row.description,
    image: row.image,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt,
  }
}

export async function getCertSectionsWithItems(): Promise<CertSectionWithItems[]> {
  await ensureDb()
  const [sectionRows, certRows] = await Promise.all([
    db.select().from(certSections).orderBy(asc(certSections.sortOrder), asc(certSections.createdAt)),
    db.select().from(certificates).orderBy(asc(certificates.sortOrder), asc(certificates.createdAt)),
  ])
  const itemsById: Record<number, Certificate[]> = {}
  for (const c of certRows) {
    const mapped = mapCertificate(c)
    if (!itemsById[mapped.sectionId]) itemsById[mapped.sectionId] = []
    itemsById[mapped.sectionId].push(mapped)
  }
  return sectionRows.map((s) => ({ ...mapCertSection(s), items: itemsById[s.id] ?? [] }))
}

export async function getCertSections(): Promise<CertSection[]> {
  await ensureDb()
  const rows = await db.select().from(certSections).orderBy(asc(certSections.sortOrder), asc(certSections.createdAt))
  return rows.map(mapCertSection)
}

export async function getCertSectionById(id: number): Promise<CertSection | undefined> {
  await ensureDb()
  const [row] = await db.select().from(certSections).where(eq(certSections.id, id)).limit(1)
  return row ? mapCertSection(row) : undefined
}

export async function getCertificates(sectionId?: number): Promise<Certificate[]> {
  await ensureDb()
  const rows = sectionId
    ? await db.select().from(certificates).where(eq(certificates.sectionId, sectionId)).orderBy(asc(certificates.sortOrder), asc(certificates.createdAt))
    : await db.select().from(certificates).orderBy(asc(certificates.sortOrder), asc(certificates.createdAt))
  return rows.map(mapCertificate)
}

export async function getCertificateById(id: number): Promise<Certificate | undefined> {
  await ensureDb()
  const [row] = await db.select().from(certificates).where(eq(certificates.id, id)).limit(1)
  return row ? mapCertificate(row) : undefined
}

export type CertSectionInput = { title: string; sortOrder: number }
export type CertificateInput = { sectionId: number; name: string; description: string; image: string; sortOrder: number }

export async function createCertSection(input: CertSectionInput) {
  await ensureDb()
  await db.insert(certSections).values({ ...input, createdAt: Date.now() })
}

export async function updateCertSection(id: number, input: CertSectionInput) {
  await ensureDb()
  await db.update(certSections).set(input).where(eq(certSections.id, id))
}

export async function deleteCertSection(id: number) {
  await ensureDb()
  // Delete all certs in this section first
  await db.delete(certificates).where(eq(certificates.sectionId, id))
  await db.delete(certSections).where(eq(certSections.id, id))
}

export async function createCertificate(input: CertificateInput) {
  await ensureDb()
  await db.insert(certificates).values({ ...input, createdAt: Date.now() })
}

export async function updateCertificate(id: number, input: CertificateInput) {
  await ensureDb()
  await db.update(certificates).set(input).where(eq(certificates.id, id))
}

export async function deleteCertificate(id: number) {
  await ensureDb()
  await db.delete(certificates).where(eq(certificates.id, id))
}

/* ---------- Dashboard stats ---------- */

export async function getStats() {
  await ensureDb()
  const [tourCount, reviewCount, articleCount, leadRows] = await Promise.all([
    db.$count(tours),
    db.$count(reviews),
    db.$count(articles),
    db.select().from(leads).where(eq(leads.archived, false)),
  ])
  const newLeads = (leadRows as Lead[]).filter((l) => l.status === "new").length
  return {
    tours: tourCount,
    reviews: reviewCount,
    articles: articleCount,
    leads: leadRows.length,
    newLeads,
  }
}
