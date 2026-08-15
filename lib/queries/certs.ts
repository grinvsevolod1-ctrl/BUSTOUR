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
import { mapCertSection, mapCertificate } from "./_shared"
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

/** Swap sortOrder with neighbour section. Normalizes duplicate orders. */
export async function moveCertSection(id: number, direction: "up" | "down") {
  await ensureDb()
  const siblings = await db.select().from(certSections).orderBy(asc(certSections.sortOrder), asc(certSections.createdAt))
  const index = siblings.findIndex((s) => s.id === id)
  const swapIndex = direction === "up" ? index - 1 : index + 1
  if (index < 0 || swapIndex < 0 || swapIndex >= siblings.length) return
  const ordered = [...siblings]
  ;[ordered[index], ordered[swapIndex]] = [ordered[swapIndex], ordered[index]]
  await db.transaction(async (tx) => {
    for (let i = 0; i < ordered.length; i++) {
      if (ordered[i].sortOrder !== i) {
        await tx.update(certSections).set({ sortOrder: i }).where(eq(certSections.id, ordered[i].id))
      }
    }
  })
}

/** Swap sortOrder with neighbour certificate within the same section. Normalizes duplicate orders. */
export async function moveCertificate(id: number, direction: "up" | "down") {
  await ensureDb()
  const [current] = await db.select().from(certificates).where(eq(certificates.id, id)).limit(1)
  if (!current) return
  const siblings = await db
    .select()
    .from(certificates)
    .where(eq(certificates.sectionId, current.sectionId))
    .orderBy(asc(certificates.sortOrder), asc(certificates.createdAt))
  const index = siblings.findIndex((c) => c.id === id)
  const swapIndex = direction === "up" ? index - 1 : index + 1
  if (index < 0 || swapIndex < 0 || swapIndex >= siblings.length) return
  const ordered = [...siblings]
  ;[ordered[index], ordered[swapIndex]] = [ordered[swapIndex], ordered[index]]
  await db.transaction(async (tx) => {
    for (let i = 0; i < ordered.length; i++) {
      if (ordered[i].sortOrder !== i) {
        await tx.update(certificates).set({ sortOrder: i }).where(eq(certificates.id, ordered[i].id))
      }
    }
  })
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

