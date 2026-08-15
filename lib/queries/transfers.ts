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
import { parseJson, mapTransfer } from "./_shared"
import { computeSwapUpdates, type MoveDirection } from "./move"
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

/** Swap sortOrder with neighbour within the same category (active list). Normalizes duplicate orders. */
export async function moveTransfer(id: number, direction: MoveDirection) {
  await ensureDb()
  const [current] = await db.select().from(transfers).where(eq(transfers.id, id)).limit(1)
  if (!current || current.archived) return
  const siblings = await db
    .select()
    .from(transfers)
    .where(and(eq(transfers.category, current.category), eq(transfers.archived, false)))
    .orderBy(asc(transfers.sortOrder), asc(transfers.id))
  const updates = computeSwapUpdates(siblings, id, direction)
  if (updates.length === 0) return
  await db.transaction(async (tx) => {
    for (const u of updates) {
      await tx.update(transfers).set({ sortOrder: u.sortOrder }).where(eq(transfers.id, u.id))
    }
  })
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


/* ---------- Tours ---------- */


/** Core tour listing: filter in SQL, then assemble dates only for the result set. */

