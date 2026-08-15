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

