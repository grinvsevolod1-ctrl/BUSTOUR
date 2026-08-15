/**
 * CMS for /info/dictionary — chip tabs (CRUD + order), same UI as /info/memos.
 * Legacy fixed keys dictionary.tab1|2|3.* still read as fallback.
 */

export const DICTIONARY_PAGE_CMS_KEY = "dictionary"
export const DICTIONARY_PAGE_URL = "/info/dictionary"
export const DICTIONARY_PAGE_SECTIONS_DEFAULT = ["faq", "callus"] as const
export const DICTIONARY_TABS_ORDER_KEY = "dictionary.tabs.order"

export type DictionaryEntryData = {
  id: string
  label: string
  heading: string
  body: string
}

export const DICTIONARY_DEFAULT_ENTRIES: Array<{
  shortKey: string
  label: string
  heading: string
  body: string
}> = [
  {
    shortKey: "term",
    label: "Аббревиатуры",
    heading: "Аббревиатуры",
    body:
      "На авиабилетах: MR/MRS — mister/mistress — взрослый/ая пассажир/ка с оплаченным отдельным местом в самолете, питанием и багажом; CHD — child — ребенок до 12 лет с оплаченным отдельным местом в самолете, питанием и багажом; INF — infant — ребенок до 2-х лет БЕЗ места в самолете, БЕЗ питания и БЕЗ багажа; OW — one way — билет в одну сторону; Y или N — перелет экономическим классом; C или B — перелет бизнес-классом; F — перелет первым классом; SVO — аэропорт Шереметьево (Москва); VKO — аэропорт Внуково (Москва), DME — Домодедово (Москва).\nВ отеле: HV, HV-1 (в названии отеля) — holiday village — отель, состоящий из коттеджей или вилл, разбросанных по территории. HV-1 — на первой линии пляжа; Apts, Ap. Htl. (в названии отеля) — апарт-отель, отель с апартаментами: в номерах есть кухня и кухонные принадлежности, иногда стиральная машина. WiFi — беспроводной доступ в Интернет; LAN — доступ в Интернет через локальную сеть.\nРазмещение: DBL (2 ВЗР) — double — стандартный двухместный номер для размещения двух взрослых; SGL (1 ВЗР) — single — стандартный одноместный номер для размещения одного взрослого; EXB — extra bed — дополнительное спальное место.",
  },
  {
    shortKey: "term2",
    label: "Термины",
    heading: "Термины",
    body:
      "АТОР – Ассоциация туроператоров России, в которую входит порядка 50 самых крупных туроператоров страны, контролирующих около 70% всего туристического потока.\nАвиатариф – фиксированная цена перелета туриста в пункт назначения. Все авиатарифы подразделяются на обычные, экскурсионные, групповые и специальные.\nАннуляция – отказ туриста от поездки.\nАпарт-отель – отель, планировка номера в котором включает спальню, гостиную, ванную комнату и кухню. Питание в таких отелях как правило не входит в стоимость номера.\nБагажная квитанция – документ, подтверждающий обязательства авиакомпании перед туристом за сохранность багажа во время его перевозки в пункт назначения.\nБронирование – закрепление за туристом места в гостинице, билета на какой-либо вид транспорта или пропуска на мероприятие.",
  },
  {
    shortKey: "term3",
    label: "Сокращения",
    heading: "Сокращения",
    body:
      "BB (Bed & Breakfast) — проживание с завтраком.\nHB (Half Board) — полупансион: завтрак и ужин.\nFB (Full Board) — полный пансион: завтрак, обед и ужин.\nAI (All Inclusive) — всё включено: питание, напитки и часть развлечений.\nUAI (Ultra All Inclusive) — ультра всё включено: расширенный пакет услуг.\nRO (Room Only) — только проживание, без питания.\nSNG/DBL/TPL — одноместный / двухместный / трёхместный номер.\nSS (Sea Side) — номер с видом на море.\nPO (Pool Side) — номер с видом на бассейн.",
  },
]

export function isDictionarySectionKey(key: string): boolean {
  return key === "term" || /^term\d+$/.test(key)
}

export function dictionarySlotNumber(shortKey: string): number {
  if (shortKey === "term") return 1
  const m = /^term(\d+)$/.exec(shortKey)
  return m ? Number(m[1]) : 0
}

export function shortKeyFromDictionarySlotId(id: number): string {
  if (!Number.isInteger(id) || id < 1) return ""
  return id <= 1 ? "term" : `term${id}`
}

export function dictionaryFieldSuffix(shortKey: string): string {
  const n = dictionarySlotNumber(shortKey)
  return n <= 1 ? "" : String(n)
}

export function dictionarySettingKeys(pageKey: string, shortKey: string) {
  const s = dictionaryFieldSuffix(shortKey)
  return {
    label: `${pageKey}.termLabel${s}`,
    heading: `${pageKey}.termHeading${s}`,
    body: `${pageKey}.termBody${s}`,
  }
}

/** Legacy fixed tabs dictionary.tab1|2|3.* */
export function legacyDictionaryTabKeys(n: number) {
  return {
    label: `dictionary.tab${n}.label`,
    heading: `dictionary.tab${n}.heading`,
    body: `dictionary.tab${n}.body`,
  }
}

/** Prefill modern keys from legacy for admin forms (does not write DB). */
export function hydrateDictionarySlotSettings(
  settings: Record<string, string>,
  shortKey: string,
): Record<string, string> {
  const n = dictionarySlotNumber(shortKey)
  if (n < 1 || n > 3) return settings
  const keys = dictionarySettingKeys(DICTIONARY_PAGE_CMS_KEY, shortKey)
  const legacy = legacyDictionaryTabKeys(n)
  const out = { ...settings }
  for (const field of ["label", "heading", "body"] as const) {
    if (!(out[keys[field]] || "").trim() && (out[legacy[field]] || "").trim()) {
      out[keys[field]] = out[legacy[field]]!
    }
  }
  return out
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

/** Entry shortKeys — tabs.order, else legacy tab1..3 presence, else defaults. */
export function resolveDictionaryTabsOrder(settings: Record<string, string>): string[] {
  const fromTabs = parseJsonStringArray(settings[DICTIONARY_TABS_ORDER_KEY]).filter(
    isDictionarySectionKey,
  )
  if (fromTabs.length) return fromTabs

  const legacy: string[] = []
  for (let n = 1; n <= 3; n++) {
    const keys = legacyDictionaryTabKeys(n)
    if (
      (settings[keys.label] || "").trim() ||
      (settings[keys.heading] || "").trim() ||
      (settings[keys.body] || "").trim()
    ) {
      legacy.push(shortKeyFromDictionarySlotId(n))
    }
  }
  if (legacy.length) return legacy

  return DICTIONARY_DEFAULT_ENTRIES.map((t) => t.shortKey)
}

export function dictionaryDefaultSettings(): Record<string, string> {
  const tabKeys = DICTIONARY_DEFAULT_ENTRIES.map((t) => t.shortKey)
  const out: Record<string, string> = {
    "dictionary.metaTitle": "Туристический словарь — БасТур",
    "dictionary.metaDescription":
      "Словарь туристических терминов, аббревиатур и сокращений. Говорите с турагентом на одном языке.",
    "dictionary.metaShortDesc": "Туристический словарь терминов и аббревиатур.",
    "dictionary.metaImage": "",
    "dictionary.title": "Туристический словарь",
    "dictionary.intro":
      "Отправляясь к представителю туристического агентства, дабы рассказать ему о своих желаниях и возможностях, чтобы тот подобрал вам тур, который вы хотите, — необходимо общаться с турагентами на одном языке. Насколько точно турагент воплотит в реальность все ваши пожелания по поводу грядущего отдыха, во многом зависит от того, насколько точно и понятно вы их изложите.\nГоворить с профессионалом на одном языке вам поможет наш словарь туристических терминов, в котором мы собрали понятия, общепринятые в современном международном туризме.",
    [DICTIONARY_TABS_ORDER_KEY]: JSON.stringify(tabKeys),
    "dictionary.sections.order": JSON.stringify([...DICTIONARY_PAGE_SECTIONS_DEFAULT]),
    "dictionary.section.faq": "1",
    "dictionary.section.callus": "1",
  }

  for (const entry of DICTIONARY_DEFAULT_ENTRIES) {
    const keys = dictionarySettingKeys(DICTIONARY_PAGE_CMS_KEY, entry.shortKey)
    out[`dictionary.section.${entry.shortKey}`] = "1"
    out[keys.label] = entry.label
    out[keys.heading] = entry.heading
    out[keys.body] = entry.body
  }

  return out
}

function readEntryField(
  settings: Record<string, string>,
  shortKey: string,
  field: "label" | "heading" | "body",
): string {
  const keys = dictionarySettingKeys(DICTIONARY_PAGE_CMS_KEY, shortKey)
  const modern = (settings[keys[field]] || "").trim()
  if (modern) return modern
  const n = dictionarySlotNumber(shortKey)
  if (n >= 1 && n <= 3) {
    const legacy = (settings[legacyDictionaryTabKeys(n)[field]] || "").trim()
    if (legacy) return legacy
    const def = DICTIONARY_DEFAULT_ENTRIES.find((e) => e.shortKey === shortKey)
    if (def) return def[field]
  }
  return ""
}

/** Skip seeding modern term* when legacy tabN already has content (avoid shadowing). */
export function shouldSeedDictionarySettingKey(
  key: string,
  existingKeys: Set<string>,
): boolean {
  if (existingKeys.has(key)) return false
  const m = /^dictionary\.term(Label|Heading|Body)(\d*)$/.exec(key)
  if (!m) return true
  const field = m[1]!.toLowerCase() as "label" | "heading" | "body"
  const n = m[2] ? Number(m[2]) : 1
  if (n < 1 || n > 3) return true
  return !existingKeys.has(legacyDictionaryTabKeys(n)[field])
}

export function resolveDictionaryEntriesFromSettings(
  settings: Record<string, string>,
  order: string[] = resolveDictionaryTabsOrder(settings),
): DictionaryEntryData[] {
  const pageKey = DICTIONARY_PAGE_CMS_KEY
  const entries: DictionaryEntryData[] = []

  for (const shortKey of order) {
    if (!isDictionarySectionKey(shortKey)) continue
    const vis = settings[`${pageKey}.section.${shortKey}`]
    if (vis === "0") continue

    const label = readEntryField(settings, shortKey, "label")
    const heading = readEntryField(settings, shortKey, "heading")
    const body = readEntryField(settings, shortKey, "body")

    if (!label && !heading && !body) continue

    entries.push({
      id: shortKey,
      label: label || heading || shortKey,
      heading: heading || label || shortKey,
      body,
    })
  }

  return entries
}

export function listDictionarySlotsFromOrder(order: string[]): string[] {
  return order.filter(isDictionarySectionKey)
}

export function nextDictionarySlotKey(order: string[]): string {
  const used = new Set(listDictionarySlotsFromOrder(order).map(dictionarySlotNumber))
  if (!used.has(1)) return "term"
  let n = 2
  while (used.has(n)) n++
  return n === 1 ? "term" : `term${n}`
}

export function moveDictionaryInOrder(order: string[], shortKey: string, dir: -1 | 1): string[] {
  const slots = listDictionarySlotsFromOrder(order)
  const idx = slots.indexOf(shortKey)
  const swapWith = slots[idx + dir]
  if (idx < 0 || !swapWith) return order
  const next = [...slots]
  ;[next[idx], next[idx + dir]] = [swapWith, shortKey]
  return next
}

export type DictionaryAdminRow = {
  shortKey: string
  label: string
  visible: boolean
}

export function dictionaryAdminRows(
  settings: Record<string, string>,
  order: string[] = resolveDictionaryTabsOrder(settings),
): DictionaryAdminRow[] {
  return listDictionarySlotsFromOrder(order).map((shortKey) => {
    const label =
      readEntryField(settings, shortKey, "label") ||
      readEntryField(settings, shortKey, "heading") ||
      shortKey
    return {
      shortKey,
      label,
      visible: settings[`${DICTIONARY_PAGE_CMS_KEY}.section.${shortKey}`] !== "0",
    }
  })
}
