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
