import { and, asc, count as countRows, desc, eq, inArray, like, ne, notInArray } from "drizzle-orm"
import { db, type DbExecutor } from "@/lib/db"
import { tours, buses, transfers, transferSchedules, reviews, articles, leads, countries, cityDestinations, staff, certSections, certificates, contentBlocks, tourDates, tourDateTags, tourDateRooms, settings } from "@/lib/db/schema"
import { ensureDb } from "@/lib/db/init"
import { isArticleCategory, type Bus, type Transfer, type TransferCategory, type TransferDirection, type TransferSchedule, type Tour, type Review, type Article, type ArticleCategory, type Lead, type StaffMember, type DatesTable, type CertSection, type Certificate, type CertSectionWithItems } from "@/lib/types"
import { parseAlertKind } from "@/lib/alert-kind"
import { getArchivedCities } from "@/lib/cities"
import { getArchivedCountries } from "@/lib/countries"
import { computeSwapUpdates, type MoveDirection } from "./move"
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
import { mapStaff } from "./_shared"
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

/** Swap sortOrder with neighbour in the active staff list. Normalizes duplicate orders. */
export async function moveStaffMember(id: number, direction: MoveDirection) {
  await ensureDb()
  const siblings = await db
    .select()
    .from(staff)
    .where(eq(staff.archived, false))
    .orderBy(asc(staff.sortOrder), asc(staff.createdAt))
  const updates = computeSwapUpdates(siblings, id, direction)
  if (updates.length === 0) return
  await db.transaction(async (tx) => {
    for (const u of updates) {
      await tx.update(staff).set({ sortOrder: u.sortOrder }).where(eq(staff.id, u.id))
    }
  })
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



