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
import { parseJson, mapBus } from "./_shared"
import { computeSwapUpdates, type MoveDirection } from "./move"
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

/** Swap sortOrder with neighbour in the active fleet list. Normalizes duplicate orders. */
export async function moveBus(id: number, direction: MoveDirection) {
  await ensureDb()
  const [current] = await db.select().from(buses).where(eq(buses.id, id)).limit(1)
  if (!current || current.archived) return
  const siblings = await db
    .select()
    .from(buses)
    .where(eq(buses.archived, false))
    .orderBy(asc(buses.sortOrder), asc(buses.id))
  const updates = computeSwapUpdates(siblings, id, direction)
  if (updates.length === 0) return
  await db.transaction(async (tx) => {
    for (const u of updates) {
      await tx.update(buses).set({ sortOrder: u.sortOrder }).where(eq(buses.id, u.id))
    }
  })
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


