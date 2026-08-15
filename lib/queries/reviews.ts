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
import { mapReview } from "./_shared"
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

