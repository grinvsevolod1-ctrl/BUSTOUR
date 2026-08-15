import { cache } from "react"
import { and, asc, eq, like, or } from "drizzle-orm"
import { db, type DbExecutor } from "@/lib/db"
import { settings, contentBlocks } from "@/lib/db/schema"
import { ensureDb } from "@/lib/db/init"
import { defaultSettings } from "@/lib/db/cms-seed"
import { expandSettingsValues } from "@/lib/expand-content-blocks"
import type { BlockCollection, ContentBlock, SiteSettings } from "@/lib/types"

/* ---------------- Settings ---------------- */

export async function getSettings(): Promise<SiteSettings> {
  await ensureDb()
  const rows = await db.select().from(settings)
  const map: SiteSettings = { ...defaultSettings }
  for (const row of rows) map[row.key] = row.value
  return map
}

/**
 * Public pages only: settings with `[Shortcodes]` already expanded. Admin must use `getSettings()`.
 *
 * Обёрнуто в React cache(): layout, generateMetadata и страница дёргают эту функцию
 * в одном запросе — SQL выполняется один раз на рендер, а не 3-4 раза.
 */
export const getPublicSettings = cache(async (): Promise<SiteSettings> => {
  return expandSettingsValues(await getSettings())
})

/**
 * Returns the site origin with protocol and no trailing slash for Tourvisor widget URLs.
 * Priority: settings["site.url"] → NEXT_PUBLIC_SITE_URL env → "https://bastur.by"
 */
export function getSiteOrigin(settings: SiteSettings): string {
  const raw =
    (settings["site.url"] as string | undefined) ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://bastur.by"
  // Ensure protocol is present
  const withProtocol = /^https?:\/\//.test(raw) ? raw : `https://${raw}`
  return withProtocol.replace(/\/$/, "")
}

export function isOn(settings: SiteSettings, key: string): boolean {
  const v = settings[key]
  return v === undefined ? true : v === "1"
}

export async function isTourVisible(slug: string): Promise<boolean> {
  const siteSettings = await getSettings()
  return siteSettings[`tour:${slug}.visible`] !== "0"
}

export async function getHiddenTourSlugs(): Promise<Set<string>> {
  await ensureDb()
  // Prefix scan on PK `key` — avoid loading full settings map for listings.
  const rows = await db
    .select({ key: settings.key, value: settings.value })
    .from(settings)
    .where(and(like(settings.key, "tour:%"), eq(settings.value, "0")))
  return new Set(
    rows
      .filter((row) => row.key.endsWith(".visible"))
      .map((row) => row.key.slice("tour:".length, -".visible".length)),
  )
}

export async function saveSettings(entries: Record<string, string>, executor?: DbExecutor) {
  if (!executor) await ensureDb()
  const pairs = Object.entries(entries)
  if (!pairs.length) return
  if (executor) {
    for (const [key, value] of pairs) await executor.insert(settings).values({ key, value }).onConflictDoUpdate({ target: settings.key, set: { value } })
    return
  }
  await db.transaction(async (tx) => {
    for (const [key, value] of pairs) {
      await tx
        .insert(settings)
        .values({ key, value })
        .onConflictDoUpdate({ target: settings.key, set: { value } })
    }
  })
}

/* ---------------- Content blocks ---------------- */

function mapBlock(row: typeof contentBlocks.$inferSelect): ContentBlock {
  let extra: Record<string, unknown> = {}
  try {
    extra = JSON.parse(row.extra) as Record<string, unknown>
  } catch {
    extra = {}
  }
  return {
    id: row.id,
    collection: row.collection as BlockCollection,
    page: row.page,
    title: row.title,
    subtitle: row.subtitle,
    body: row.body,
    image: row.image,
    icon: row.icon,
    href: row.href,
    extra,
    sortOrder: row.sortOrder,
    visible: row.visible,
  }
}

/**
 * Один SQL-запрос на коллекцию за рендер (React cache, ключ — примитив-строка).
 * Фильтрация по page/visible — в памяти: блоков в коллекции единицы-десятки.
 */
const listCollectionBlocks = cache(async (collection: string): Promise<ContentBlock[]> => {
  await ensureDb()
  const rows = await db
    .select()
    .from(contentBlocks)
    .where(eq(contentBlocks.collection, collection))
    .orderBy(asc(contentBlocks.sortOrder), asc(contentBlocks.id))
  return rows.map(mapBlock)
})

export async function getBlocks(
  collection: BlockCollection,
  opts: { onlyVisible?: boolean; page?: string } = {},
): Promise<ContentBlock[]> {
  let blocks = await listCollectionBlocks(collection)
  if (opts.page !== undefined) blocks = blocks.filter((b) => b.page === opts.page)
  return opts.onlyVisible ? blocks.filter((b) => b.visible) : blocks
}

/** Public catalog: only visible tables explicitly configured for this admin page. */
export async function getResortBlocksForPage(
  page: string,
  _opts: { onlyVisible?: boolean } = {},
): Promise<ContentBlock[]> {
  return getBlocks("resort", { page, onlyVisible: true })
}

// FAQ for a page: only page-specific visible entries.
export async function getFaqs(page: string): Promise<ContentBlock[]> {
  return getBlocks("faq", { onlyVisible: true, page })
}

/** All FAQ blocks for pageKey + numbered slots (`pageKey::faq2`, …). */
export async function getFaqBlocksForPage(
  pageKey: string,
  opts: { onlyVisible?: boolean } = {},
): Promise<ContentBlock[]> {
  await ensureDb()
  const rows = await db
    .select()
    .from(contentBlocks)
    .where(
      and(
        eq(contentBlocks.collection, "faq"),
        or(eq(contentBlocks.page, pageKey), like(contentBlocks.page, `${pageKey}::faq%`)),
      ),
    )
    .orderBy(asc(contentBlocks.page), asc(contentBlocks.sortOrder), asc(contentBlocks.id))
  const mapped = rows.map(mapBlock)
  return opts.onlyVisible ? mapped.filter((b) => b.visible) : mapped
}

export async function getBlockById(id: number): Promise<ContentBlock | undefined> {
  await ensureDb()
  const [row] = await db.select().from(contentBlocks).where(eq(contentBlocks.id, id)).limit(1)
  return row ? mapBlock(row) : undefined
}

export type BlockInput = {
  collection: BlockCollection
  page?: string
  title: string
  subtitle: string
  body: string
  image: string
  icon: string
  href: string
  extra: Record<string, unknown>
  visible: boolean
}

export async function createBlock(input: BlockInput): Promise<number> {
  await ensureDb()
  const existing = await db
    .select({ sortOrder: contentBlocks.sortOrder })
    .from(contentBlocks)
    .where(eq(contentBlocks.collection, input.collection))
  const nextOrder = existing.reduce((max, r) => Math.max(max, r.sortOrder), -1) + 1
  const [inserted] = await db.insert(contentBlocks).values({
    collection: input.collection,
    page: input.page ?? "global",
    title: input.title,
    subtitle: input.subtitle,
    body: input.body,
    image: input.image,
    icon: input.icon,
    href: input.href,
    extra: JSON.stringify(input.extra ?? {}),
    sortOrder: nextOrder,
    visible: input.visible,
    createdAt: Date.now(),
  }).returning({ id: contentBlocks.id })
  if (!inserted) throw new Error("createBlock: insert returning() returned empty row")
  return inserted.id
}

export async function updateBlock(id: number, input: BlockInput) {
  await ensureDb()
  await db
    .update(contentBlocks)
    .set({
      page: input.page ?? "global",
      title: input.title,
      subtitle: input.subtitle,
      body: input.body,
      image: input.image,
      icon: input.icon,
      href: input.href,
      extra: JSON.stringify(input.extra ?? {}),
      visible: input.visible,
    })
    .where(eq(contentBlocks.id, id))
}

// Replace all FAQ entries for a page. Accepts flat Q/A (one untitled group) or named groups.
export async function replacePageFaqs(
  page: string,
  itemsOrGroups: { question: string; answer: string }[] | { title: string; items: { question: string; answer: string }[] }[],
  executor: DbExecutor = db,
) {
  if (executor === db) await ensureDb()
  await executor.delete(contentBlocks).where(and(eq(contentBlocks.collection, "faq"), eq(contentBlocks.page, page)))

  const groups: { title: string; items: { question: string; answer: string }[] }[] =
    Array.isArray(itemsOrGroups) && itemsOrGroups.length > 0 && "items" in itemsOrGroups[0]!
      ? (itemsOrGroups as { title: string; items: { question: string; answer: string }[] }[])
      : [{ title: "", items: itemsOrGroups as { question: string; answer: string }[] }]

  const rows: {
    collection: "faq"
    page: string
    title: string
    subtitle: string
    body: string
    image: string
    icon: string
    href: string
    extra: string
    sortOrder: number
    visible: boolean
    createdAt: number
  }[] = []
  let sort = 0
  const now = Date.now()
  for (const g of groups) {
    for (const it of g.items) {
      if (!it.question.trim() || !it.answer.trim()) continue
      rows.push({
        collection: "faq",
        page,
        title: it.question,
        subtitle: (g.title || "").trim(),
        body: it.answer,
        image: "",
        icon: "",
        href: "",
        extra: "{}",
        sortOrder: sort++,
        visible: true,
        createdAt: now,
      })
    }
  }
  if (!rows.length) return
  await executor.insert(contentBlocks).values(rows)
}

export async function deleteBlock(id: number) {
  await ensureDb()
  await db.delete(contentBlocks).where(eq(contentBlocks.id, id))
}

export const purgeBlock = deleteBlock

export async function setBlockVisibility(id: number, visible: boolean) {
  await ensureDb()
  await db.update(contentBlocks).set({ visible }).where(eq(contentBlocks.id, id))
}

// Move a block up/down within its collection by swapping sortOrder with its neighbour.
export async function moveBlock(id: number, direction: "up" | "down") {
  await ensureDb()
  const [current] = await db.select().from(contentBlocks).where(eq(contentBlocks.id, id)).limit(1)
  if (!current) return
  const siblings = await db
    .select()
    .from(contentBlocks)
    .where(eq(contentBlocks.collection, current.collection))
    .orderBy(asc(contentBlocks.sortOrder), asc(contentBlocks.id))
  const index = siblings.findIndex((b) => b.id === id)
  const swapIndex = direction === "up" ? index - 1 : index + 1
  if (swapIndex < 0 || swapIndex >= siblings.length) return
  const neighbour = siblings[swapIndex]
  await db.update(contentBlocks).set({ sortOrder: neighbour.sortOrder }).where(eq(contentBlocks.id, current.id))
  await db.update(contentBlocks).set({ sortOrder: current.sortOrder }).where(eq(contentBlocks.id, neighbour.id))
}

export async function reorderBlocks(collection: BlockCollection, orderedIds: number[]) {
  await ensureDb()
  const ids = Array.from(new Set(orderedIds.filter((id) => Number.isInteger(id) && id > 0)))
  if (ids.length < 2) return
  const first = ids[0]
  const [current] = await db.select().from(contentBlocks).where(eq(contentBlocks.id, first)).limit(1)
  if (!current || current.collection !== collection) return
  const siblings = await db
    .select({ id: contentBlocks.id })
    .from(contentBlocks)
    .where(eq(contentBlocks.collection, collection))
    .orderBy(asc(contentBlocks.sortOrder), asc(contentBlocks.id))
  if (siblings.length !== ids.length) return
  const siblingIds = siblings.map((row) => row.id)
  const siblingSet = new Set(siblingIds)
  if (!ids.every((id) => siblingSet.has(id))) return
  if (ids.every((id, index) => id === siblingIds[index])) return
  await db.transaction(async (tx) => {
    for (const [sortOrder, id] of ids.entries()) {
      await tx.update(contentBlocks).set({ sortOrder }).where(eq(contentBlocks.id, id))
    }
  })
}
