/**
 * Propose remaps of orphaned CMS page keys → live entity page keys after slug renames.
 * Pure matching — DB I/O lives in the one-shot script.
 */

export type CmsLiveEntity = {
  pageKey: string
  /** Display / scoring */
  name: string
  slug: string
  /** country | city only */
  category?: string
  kind: "country" | "city" | "tour" | "bus" | "transfer"
}

export type CmsPageBag = {
  pageKey: string
  settingKeys: string[]
  blockCount: number
}

const KNOWN_HOME_PAGES = new Set([
  "global",
  "home",
  "hot",
  "aviatory",
  "bustours",
  "rental",
  "dictionary",
  "company",
  "legal",
  "egipet",
  "category:bus",
  "category:avia",
  "category:hot",
  "busRental",
  "page.tours",
])

const CONTENTFUL_SUFFIXES = [
  ".h1",
  ".intro",
  ".metaTitle",
  ".metaDescription",
  ".metaShortDesc",
  ".metaImage",
  ".seoHtml",
  ".seoTitle",
  ".seoHtml2",
  ".seoTitle2",
  ".citiesTitle",
]

/** Extract page scope from a settings key or content_blocks.page value. */
export function pageKeyFromSettingKey(key: string): string | null {
  const k = key.trim()
  if (!k) return null

  // country:{cat}:{slug}.* | city:{cat}:{slug}.*
  let m = /^(country|city):(bus|avia|hot):([^./]+)/.exec(k)
  if (m) return `${m[1]}:${m[2]}:${m[3]}`

  // tour:{id|slug}.* | bus:{slug}.* | transfer:{slug}.*
  m = /^(tour|bus|transfer):([^./]+)/.exec(k)
  if (m) return `${m[1]}:${m[2]}`

  // bare home-style prefixes: hot.h1, aviatory.slug
  m = /^([a-z][a-z0-9-]*)\./i.exec(k)
  if (m) return m[1]!.toLowerCase()

  return null
}

export function isKnownHomePage(pageKey: string): boolean {
  return KNOWN_HOME_PAGES.has(pageKey) || pageKey.startsWith("page.")
}

/** tour:123 (numeric id) is meta keyed by id — not a rename orphan. */
export function isTourIdPageKey(pageKey: string): boolean {
  return /^tour:\d+$/.test(pageKey)
}

export function isContentfulBag(bag: CmsPageBag): boolean {
  if (bag.blockCount > 0) return true
  return bag.settingKeys.some((key) =>
    CONTENTFUL_SUFFIXES.some((suffix) => key.endsWith(suffix) && !key.endsWith(".section.callus")),
  )
}

/** Only visibility / callus / section toggles / order = "empty" after create. */
export function isEmptyLiveBag(bag: CmsPageBag | undefined): boolean {
  if (!bag) return true
  if (bag.blockCount > 0) return false
  if (!bag.settingKeys.length) return true
  return bag.settingKeys.every((key) => {
    if (key.endsWith(".visible")) return true
    if (key.endsWith(".section.callus")) return true
    if (key.endsWith(".sections.order")) return true
    // section visibility toggles: …section.cities / …section.faq / …section.seo2
    if (/\.section\.[a-z0-9]+$/i.test(key) && !key.includes(".tableId")) return true
    return false
  })
}

function slugifyLite(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^a-z0-9а-я]+/gi, "-")
    .replace(/^-+|-+$/g, "")
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  const row = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let prev = i - 1
    row[0] = i
    for (let j = 1; j <= b.length; j++) {
      const cur = row[j]!
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      row[j] = Math.min(row[j]! + 1, row[j - 1]! + 1, prev + cost)
      prev = cur
    }
  }
  return row[b.length]!
}

export function scoreOrphanToLive(orphanSlug: string, live: CmsLiveEntity): number {
  const orphan = orphanSlug.toLowerCase()
  const liveSlug = live.slug.toLowerCase()
  const fromName = slugifyLite(live.name)
  if (orphan === fromName) return 100
  if (orphan === liveSlug) return 0 // same slug = not an orphan remap target
  const dist = levenshtein(orphan, liveSlug)
  const maxLen = Math.max(orphan.length, liveSlug.length) || 1
  const similarity = 1 - dist / maxLen
  if (similarity >= 0.6) return Math.round(40 + similarity * 40)
  const distName = levenshtein(orphan, fromName)
  const maxName = Math.max(orphan.length, fromName.length) || 1
  const simName = 1 - distName / maxName
  if (simName >= 0.55) return Math.round(30 + simName * 30)
  return 0
}

export type CmsRemapProposal = {
  from: string
  to: string
  score: number
  reason: string
}

export type CmsCleanupPlan = {
  remaps: CmsRemapProposal[]
  /** Contentful orphans with no safe live target (deleted entity or leftover). */
  unmatchedOrphans: string[]
  unmatchedEmpties: string[]
  /** Orphans that look like duplicates of an already-filled live page (safe to delete). */
  purgeDuplicates: { orphan: string; live: string; score: number }[]
}

/**
 * Match contentful orphans to empty live entities (same kind + category).
 */
export function planOrphanCmsRemaps(
  live: CmsLiveEntity[],
  bags: Map<string, CmsPageBag>,
): CmsCleanupPlan {
  const liveKeys = new Set(live.map((e) => e.pageKey))

  const orphans: { pageKey: string; kind: string; category?: string; slug: string; bag: CmsPageBag }[] =
    []
  for (const [pageKey, bag] of bags) {
    if (liveKeys.has(pageKey)) continue
    if (isKnownHomePage(pageKey)) continue
    if (isTourIdPageKey(pageKey)) continue
    if (!isContentfulBag(bag)) continue

    const countryCity = /^(country|city):(bus|avia|hot):(.+)$/.exec(pageKey)
    if (countryCity) {
      orphans.push({
        pageKey,
        kind: countryCity[1]!,
        category: countryCity[2],
        slug: countryCity[3]!,
        bag,
      })
      continue
    }
    const simple = /^(tour|bus|transfer):(.+)$/.exec(pageKey)
    if (simple) {
      orphans.push({
        pageKey,
        kind: simple[1]!,
        slug: simple[2]!,
        bag,
      })
    }
  }

  const empties = live.filter(
    (e) => !isTourIdPageKey(e.pageKey) && isEmptyLiveBag(bags.get(e.pageKey)),
  )

  const remaps: CmsRemapProposal[] = []
  const usedOrphans = new Set<string>()
  const usedLives = new Set<string>()

  type Cand = { orphanKey: string; liveKey: string; score: number; reason: string }
  const candidates: Cand[] = []

  for (const orphan of orphans) {
    const pool = empties.filter(
      (e) =>
        e.kind === orphan.kind &&
        (orphan.category ? e.category === orphan.category : true) &&
        e.pageKey !== orphan.pageKey,
    )
    for (const liveEnt of pool) {
      let score = scoreOrphanToLive(orphan.slug, liveEnt)
      let reason = score >= 100 ? "slugify(name)" : score > 0 ? "slug similarity" : ""
      if (pool.length === 1 && orphans.filter((o) => o.kind === orphan.kind && o.category === orphan.category).length === 1) {
        score = Math.max(score, 50)
        reason = reason || "sole empty↔orphan in group"
      }
      if (score > 0) {
        candidates.push({
          orphanKey: orphan.pageKey,
          liveKey: liveEnt.pageKey,
          score,
          reason: reason || "match",
        })
      }
    }
  }

  candidates.sort((a, b) => b.score - a.score || a.orphanKey.localeCompare(b.orphanKey))
  for (const c of candidates) {
    if (usedOrphans.has(c.orphanKey) || usedLives.has(c.liveKey)) continue
    usedOrphans.add(c.orphanKey)
    usedLives.add(c.liveKey)
    remaps.push({ from: c.orphanKey, to: c.liveKey, score: c.score, reason: c.reason })
  }

  const purgeDuplicates: { orphan: string; live: string; score: number }[] = []
  const stillOrphans = orphans.filter((o) => !usedOrphans.has(o.pageKey))
  for (const orphan of stillOrphans) {
    const pool = live.filter(
      (e) =>
        e.kind === orphan.kind &&
        (orphan.category ? e.category === orphan.category : true) &&
        !isTourIdPageKey(e.pageKey) &&
        !isEmptyLiveBag(bags.get(e.pageKey)),
    )
    let best: { live: CmsLiveEntity; score: number } | null = null
    for (const liveEnt of pool) {
      const score = scoreOrphanToLive(orphan.slug, liveEnt)
      if (score < 80) continue
      if (!best || score > best.score) best = { live: liveEnt, score }
    }
    if (best) {
      purgeDuplicates.push({ orphan: orphan.pageKey, live: best.live.pageKey, score: best.score })
      usedOrphans.add(orphan.pageKey)
    }
  }

  return {
    remaps,
    unmatchedOrphans: orphans.map((o) => o.pageKey).filter((k) => !usedOrphans.has(k)),
    unmatchedEmpties: empties.map((e) => e.pageKey).filter((k) => !usedLives.has(k)),
    purgeDuplicates,
  }
}
