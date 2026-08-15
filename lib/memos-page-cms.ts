/**
 * CMS for /info/memos — tabs order separate from page extras (callus/faq).
 * #96
 */

export const MEMOS_PAGE_CMS_KEY = "memos"
export const MEMOS_PAGE_URL = "/info/memos"
/** Page extras only (no memo tabs — those live in tabs.order). */
export const MEMOS_PAGE_SECTIONS_DEFAULT = ["callus"] as const
export const MEMOS_TABS_ORDER_KEY = "memos.tabs.order"

/** @deprecated legacy mixed order; prefer MEMOS_TABS_ORDER_KEY + MEMOS_PAGE_SECTIONS_DEFAULT */
export const MEMOS_DEFAULT_SECTION_ORDER = [
  "memo",
  "memo2",
  "memo3",
  "memo4",
  "memo5",
  "memo6",
  "memo7",
  "callus",
] as const

export type MemoTabData = {
  id: string
  label: string
  heading: string
  bodyHtml: string
  fileTitle: string
  fileHref: string
}

/** Default tabs migrated from former public hardcode. */
export const MEMOS_DEFAULT_TABS: Array<{
  shortKey: string
  label: string
  countryAccusative: string
  file: string
}> = [
  { shortKey: "memo", label: "Турция", countryAccusative: "Турцию", file: "turkey.pdf" },
  { shortKey: "memo2", label: "Египет", countryAccusative: "Египет", file: "egypt.pdf" },
  { shortKey: "memo3", label: "ОАЭ", countryAccusative: "ОАЭ", file: "uae.pdf" },
  { shortKey: "memo4", label: "Грузия", countryAccusative: "Грузию", file: "georgia.pdf" },
  { shortKey: "memo5", label: "Кипр", countryAccusative: "Кипр", file: "cyprus.pdf" },
  { shortKey: "memo6", label: "Болгария", countryAccusative: "Болгарию", file: "bulgaria.pdf" },
  { shortKey: "memo7", label: "Черногория", countryAccusative: "Черногорию", file: "montenegro.pdf" },
]

export function isMemoSectionKey(key: string): boolean {
  return key === "memo" || /^memo\d+$/.test(key)
}

export function memoSlotNumber(shortKey: string): number {
  if (shortKey === "memo") return 1
  const m = /^memo(\d+)$/.exec(shortKey)
  return m ? Number(m[1]) : 0
}

/** Numeric id for SortableTableBody / SortOrderButtons ↔ shortKey. */
export function shortKeyFromMemoSlotId(id: number): string {
  if (!Number.isInteger(id) || id < 1) return ""
  return id <= 1 ? "memo" : `memo${id}`
}

/** SEO-style suffix: first slot "", then "2", "3", … */
export function memoFieldSuffix(shortKey: string): string {
  const n = memoSlotNumber(shortKey)
  return n <= 1 ? "" : String(n)
}

export function memoSettingKeys(pageKey: string, shortKey: string) {
  const s = memoFieldSuffix(shortKey)
  return {
    label: `${pageKey}.memoLabel${s}`,
    heading: `${pageKey}.memoHeading${s}`,
    body: `${pageKey}.memoBody${s}`,
    file: `${pageKey}.memoFile${s}`,
    fileTitle: `${pageKey}.memoFileTitle${s}`,
  }
}

export function buildDefaultMemoBody(countryAccusative: string): string {
  return `<p>Памятка содержит важную информацию для всех путешествующих и правила, соблюдение которых поможет Вам избежать затруднений во время Вашего путешествия в ${countryAccusative}.</p>`
}

export function buildDefaultMemoHeading(countryAccusative: string): string {
  return `Памятка туристам, выезжающим в ${countryAccusative}`
}

function parseJsonStringArray(raw: string | undefined): string[] {
  if (!raw) return []
  try {
    const v: unknown = JSON.parse(raw)
    return Array.isArray(v) ? v.filter((k): k is string => typeof k === "string") : []
  } catch {
    return []
  }
}

/** Tab shortKeys only — from tabs.order, else legacy sections.order, else defaults. */
export function resolveMemosTabsOrder(settings: Record<string, string>): string[] {
  const fromTabs = parseJsonStringArray(settings[MEMOS_TABS_ORDER_KEY]).filter(isMemoSectionKey)
  if (fromTabs.length) return fromTabs
  const fromSections = parseJsonStringArray(settings[`${MEMOS_PAGE_CMS_KEY}.sections.order`]).filter(
    isMemoSectionKey,
  )
  if (fromSections.length) return fromSections
  return MEMOS_DEFAULT_TABS.map((t) => t.shortKey)
}

/** Seed map for cms-seed / ensure defaults (does not overwrite existing keys). */
export function memosDefaultSettings(): Record<string, string> {
  const tabKeys = MEMOS_DEFAULT_TABS.map((t) => t.shortKey)
  const out: Record<string, string> = {
    "memos.metaTitle": "Памятки туристу — БасТур",
    "memos.metaDescription":
      "Памятки для туристов, выезжающих в разные страны: важная информация и правила, которые помогут избежать затруднений во время путешествия.",
    "memos.metaShortDesc": "Памятки туристам по странам — скачать PDF.",
    "memos.metaKeywords": "памятка туристу, документы, турция, египет",
    "memos.metaImage": "",
    "memos.title": "Памятки туристу",
    "memos.intro":
      "В этом разделе вы можете ознакомиться и скачать памятки для туристов, выезжающих в разные страны.",
    "memos.headerImage": "",
    [MEMOS_TABS_ORDER_KEY]: JSON.stringify(tabKeys),
    "memos.sections.order": JSON.stringify([...MEMOS_PAGE_SECTIONS_DEFAULT]),
    "memos.section.callus": "1",
  }

  for (const tab of MEMOS_DEFAULT_TABS) {
    const keys = memoSettingKeys(MEMOS_PAGE_CMS_KEY, tab.shortKey)
    const heading = buildDefaultMemoHeading(tab.countryAccusative)
    out[`memos.section.${tab.shortKey}`] = "1"
    out[keys.label] = tab.label
    out[keys.heading] = heading
    out[keys.body] = buildDefaultMemoBody(tab.countryAccusative)
    out[keys.file] = `/files/memos/${tab.file}`
    out[keys.fileTitle] = heading
  }

  return out
}

export function resolveMemoTabsFromSettings(
  settings: Record<string, string>,
  order: string[] = resolveMemosTabsOrder(settings),
): MemoTabData[] {
  const pageKey = MEMOS_PAGE_CMS_KEY
  const tabs: MemoTabData[] = []

  for (const shortKey of order) {
    if (!isMemoSectionKey(shortKey)) continue
    const vis = settings[`${pageKey}.section.${shortKey}`]
    if (vis === "0") continue

    const keys = memoSettingKeys(pageKey, shortKey)
    const label = (settings[keys.label] || "").trim()
    const heading = (settings[keys.heading] || "").trim()
    const bodyHtml = (settings[keys.body] || "").trim()
    const fileHref = (settings[keys.file] || "").trim()
    const fileTitle = (settings[keys.fileTitle] || heading || label).trim()

    if (!label && !heading && !bodyHtml && !fileHref) continue

    tabs.push({
      id: shortKey,
      label: label || heading || shortKey,
      heading: heading || label || shortKey,
      bodyHtml,
      fileTitle: fileTitle || heading || label,
      fileHref,
    })
  }

  return tabs
}

/** Max 1 file URL per memo slot (empty or single path/URL). */
export function assertSingleMemoFile(value: string): boolean {
  const v = value.trim()
  if (!v) return true
  if (v.startsWith("[")) return false
  if (v.includes(",") && !v.startsWith("http") && !v.startsWith("/")) return false
  return true
}

export function listMemoSlotsFromOrder(order: string[]): string[] {
  return order.filter(isMemoSectionKey)
}

export function nextMemoSlotKey(order: string[]): string {
  const used = new Set(listMemoSlotsFromOrder(order).map(memoSlotNumber))
  if (!used.has(1)) return "memo"
  let n = 2
  while (used.has(n)) n++
  return n === 1 ? "memo" : `memo${n}`
}

export function moveMemoInOrder(order: string[], shortKey: string, dir: -1 | 1): string[] {
  const memos = listMemoSlotsFromOrder(order)
  const idx = memos.indexOf(shortKey)
  const swapWith = memos[idx + dir]
  if (idx < 0 || !swapWith) return order
  const next = [...memos]
  ;[next[idx], next[idx + dir]] = [swapWith, shortKey]
  return next
}

export type MemoAdminRow = {
  shortKey: string
  label: string
  fileHref: string
  visible: boolean
}

export function memoAdminRows(
  settings: Record<string, string>,
  order: string[] = resolveMemosTabsOrder(settings),
): MemoAdminRow[] {
  const pageKey = MEMOS_PAGE_CMS_KEY
  return listMemoSlotsFromOrder(order).map((shortKey) => {
    const keys = memoSettingKeys(pageKey, shortKey)
    const label =
      (settings[keys.label] || "").trim() || (settings[keys.heading] || "").trim() || shortKey
    return {
      shortKey,
      label,
      fileHref: (settings[keys.file] || "").trim(),
      visible: settings[`${pageKey}.section.${shortKey}`] !== "0",
    }
  })
}
