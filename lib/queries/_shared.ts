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
export function parseJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

export type DatesTourMeta = {
  id: number
  datesNote: string
  datesNoteType: string
  datesCurrency: string
  datesFootnotes: string | null
}

export function parseStoredFootnotes(raw: string | null | undefined): string[] | undefined {
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

export function mapTour(
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

export function mapBus(row: typeof buses.$inferSelect): Bus {
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

export function mapTransfer(row: typeof transfers.$inferSelect): Transfer {
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

export function mapArticle(row: typeof articles.$inferSelect): Article {
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

export function mapReview(r: typeof reviews.$inferSelect): Review {
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

export function mapStaff(row: typeof staff.$inferSelect): StaffMember {
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

export function mapCertSection(row: typeof certSections.$inferSelect): CertSection {
  return {
    id: row.id,
    title: row.title,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt,
  }
}

export function mapCertificate(row: typeof certificates.$inferSelect): Certificate {
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

