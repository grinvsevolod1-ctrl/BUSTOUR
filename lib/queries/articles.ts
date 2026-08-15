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
import { mapArticle } from "./_shared"
import { getArchivedTours } from "./tours"
import { getArchivedBuses } from "./buses"
import { getArchivedReviews } from "./reviews"
import { getArchivedStaff } from "./staff"
import { getArchivedTransfers } from "./transfers"
import { getArchivedLeads } from "./leads"
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
