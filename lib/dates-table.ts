import type { DatesTable, DatesTableRow, DatesTableRoom, DatesTableTag } from "@/lib/types"
import { parseAlertKind } from "@/lib/alert-kind"

/** Legacy default lines when JSON has no `footnotes` key. */
export const DEFAULT_DATES_FOOTNOTES = [
  "* Цены указаны в {currency} на 1 человека.",
  "** Скидка действует при бронировании выбранной категории номера.",
] as const

export const emptyDatesTable: DatesTable = {
  note: "",
  noteType: "info",
  currency: "BYN",
  footnotes: [...DEFAULT_DATES_FOOTNOTES],
  rows: [],
}

// Number of rows shown before the "Показать все доступные даты" toggle appears.
export const DATES_COLLAPSED_ROWS = 3

export const TAG_ICONS = ["flag", "gift", "star", "calendar", "sun", "snowflake", "heart", "sparkles"] as const

function coerceFootnotes(raw: unknown): string[] {
  if (raw === undefined) return [...DEFAULT_DATES_FOOTNOTES]
  if (!Array.isArray(raw)) return [...DEFAULT_DATES_FOOTNOTES]
  return raw.map((line) => String(line ?? ""))
}

/** Substitute `{currency}` in each footnote template. Empty templates omitted. */
export function formatDatesFootnotes(table: Pick<DatesTable, "currency" | "footnotes">): string[] {
  const code = table.currency.trim() || "BYN"
  return table.footnotes
    .map((line) => line.replaceAll("{currency}", code).trim())
    .filter(Boolean)
}

function toNumber(value: unknown): number {
  const n = typeof value === "number" ? value : Number.parseFloat(String(value ?? "").replace(",", "."))
  return Number.isFinite(n) ? n : 0
}

function coerceTag(raw: unknown): DatesTableTag {
  const r = (raw ?? {}) as Record<string, unknown>
  return { icon: String(r.icon ?? "flag"), label: String(r.label ?? "") }
}

function coerceRoom(raw: unknown): DatesTableRoom {
  const r = (raw ?? {}) as Record<string, unknown>
  const discount = Math.min(100, Math.max(0, Math.round(toNumber(r.discount))))
  const id = Number(r.id)
  return { ...(Number.isFinite(id) && id > 0 ? { id } : {}), name: String(r.name ?? ""), price: Math.max(0, Math.round(toNumber(r.price))), discount }
}

export function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
}

function coerceRow(raw: unknown): DatesTableRow {
  const r = (raw ?? {}) as Record<string, unknown>
  const legacy = parseLegacyDateRange(String(r.dates ?? ""))
  const startDate = isIsoDate(r.startDate) ? r.startDate : legacy.startDate
  const endDate = isIsoDate(r.endDate) ? r.endDate : legacy.endDate
  const id = Number(r.id)
  return {
    ...(Number.isFinite(id) && id > 0 ? { id } : {}),
    startDate,
    endDate,
    description: String(r.description ?? ""),
    extraPriceAmount: Math.max(0, toNumber(r.extraPriceAmount)),
    extraPriceCurrency: String(r.extraPriceCurrency ?? "").trim().toUpperCase(),
    tags: Array.isArray(r.tags) ? r.tags.map(coerceTag) : [],
    rooms: Array.isArray(r.rooms) ? r.rooms.map(coerceRoom) : [],
  }
}

export function coerceDatesTable(raw: unknown): DatesTable {
  const r = (raw ?? {}) as Record<string, unknown>
  return {
    note: String(r.note ?? ""),
    noteType: parseAlertKind(String(r.noteType ?? "")),
    currency: String(r.currency ?? "BYN") || "BYN",
    footnotes: coerceFootnotes(r.footnotes),
    rows: Array.isArray(r.rows) ? r.rows.map(coerceRow) : [],
  }
}

function dateParts(value: string): { year: number; month: number; day: number } | null {
  if (!isIsoDate(value)) return null
  const [year, month, day] = value.split("-").map(Number)
  return { year, month, day }
}

function displayDate(value: string, withYear = true): string {
  const parts = dateParts(value)
  if (!parts) return ""
  const base = `${String(parts.day).padStart(2, "0")}.${String(parts.month).padStart(2, "0")}`
  return withYear ? `${base}.${parts.year}` : base
}

export function formatDateRange(start: string, end: string): string {
  const startDate = dateParts(start)
  const endDate = dateParts(end)
  if (!startDate && !endDate) return ""
  if (!startDate) return `до ${displayDate(end)}`
  if (!endDate) return `с ${displayDate(start)}`
  if (start === end) return displayDate(start)
  if (startDate.year === endDate.year) return `${displayDate(start, false)} - ${displayDate(end)}`
  return `${displayDate(start)} - ${displayDate(end)}`
}

function plural(value: number, one: string, few: string, many: string): string {
  const n = Math.abs(value) % 100
  if (n >= 11 && n <= 19) return many
  switch (n % 10) {
    case 1: return one
    case 2:
    case 3:
    case 4: return few
    default: return many
  }
}

export function deriveDuration(start: string, end: string): string {
  const startDate = dateParts(start)
  const endDate = dateParts(end)
  if (!startDate || !endDate) return ""
  const from = Date.parse(`${start}T00:00:00Z`)
  const to = Date.parse(`${end}T00:00:00Z`)
  const nights = Math.round((to - from) / 86400000)
  if (!Number.isFinite(nights) || nights < 0) return ""
  const days = nights + 1
  return `${days} ${plural(days, "день", "дня", "дней")} / ${nights} ${plural(nights, "ночь", "ночи", "ночей")}`
}

export function parseLegacyDateRange(value: string): { startDate: string; endDate: string } {
  const text = String(value ?? "").trim()
  const match = text.match(/^(\d{1,2})\.(\d{1,2})(?:\.(\d{4}))?\s*-\s*(\d{1,2})\.(\d{1,2})(?:\.(\d{4}))?$/)
  if (!match) return { startDate: "", endDate: "" }
  const endYear = match[6] ? Number(match[6]) : null
  const startYear = match[3] ? Number(match[3]) : endYear
  if (!startYear || !endYear) return { startDate: "", endDate: "" }
  const startDate = `${startYear}-${String(Number(match[2])).padStart(2, "0")}-${String(Number(match[1])).padStart(2, "0")}`
  const endDate = `${endYear}-${String(Number(match[5])).padStart(2, "0")}-${String(Number(match[4])).padStart(2, "0")}`
  if (!dateParts(startDate) || !dateParts(endDate)) return { startDate: "", endDate: "" }
  return { startDate, endDate }
}

export function finalPrice(room: DatesTableRoom): number {
  return room.discount > 0 ? Math.round(room.price * (1 - room.discount / 100)) : room.price
}

/** Local calendar YYYY-MM-DD (site timezone = browser/server local). */
export function todayIso(now = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, "0")
  const d = String(now.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

/** Departure is current when startDate >= today (ISO compare). */
export function isUpcomingDeparture(startDate: string, today = todayIso()): boolean {
  return isIsoDate(startDate) && startDate >= today
}

export function upcomingRows(rows: DatesTableRow[], today = todayIso()): DatesTableRow[] {
  return rows.filter((row) => isUpcomingDeparture(row.startDate, today))
}

export const ALL_PERIODS_LABEL = "Любой период"

export function periodOptionLabel(start: string, end: string): string {
  return formatDateRange(start, end) || start
}

/** Unique upcoming departure labels from pricing tables, sorted by startDate. */
export function collectPeriodLabels(tables: DatesTable[], today = todayIso()): string[] {
  const byLabel = new Map<string, string>()
  for (const table of tables) {
    for (const row of upcomingRows(table.rows, today)) {
      const label = periodOptionLabel(row.startDate, row.endDate)
      if (!label) continue
      const existingStart = byLabel.get(label)
      if (!existingStart || row.startDate < existingStart) byLabel.set(label, row.startDate)
    }
  }
  return [...byLabel.entries()]
    .sort((a, b) => a[1].localeCompare(b[1]))
    .map(([label]) => label)
}

export function rowMatchesPeriodLabel(row: DatesTableRow, label: string): boolean {
  return periodOptionLabel(row.startDate, row.endDate) === label
}

export function tourMatchesPeriod(table: DatesTable, periodLabel: string, today = todayIso()): boolean {
  if (!periodLabel || periodLabel === ALL_PERIODS_LABEL) return true
  return upcomingRows(table.rows, today).some((row) => rowMatchesPeriodLabel(row, periodLabel))
}

export function tourMatchesDepartureRange(table: DatesTable, start: string, end: string, today = todayIso()): boolean {
  if (!start && !end) return true
  return upcomingRows(table.rows, today).some((row) => (!start || row.startDate >= start) && (!end || row.startDate <= end))
}

export function nearestDeparture(table: DatesTable, today = todayIso()): string {
  return upcomingRows(table.rows, today).reduce((nearest, row) => !nearest || row.startDate < nearest ? row.startDate : nearest, "")
}

/** Min price across upcoming departures only (past rows ignored). */
export function minTablePrice(table: DatesTable, today = todayIso()): number {
  const prices = upcomingRows(table.rows, today).flatMap((row) =>
    row.rooms.filter((room) => room.price > 0).map(finalPrice),
  )
  return prices.length ? Math.min(...prices) : 0
}

export function deriveNights(start: string, end: string): number {
  const startDate = dateParts(start)
  const endDate = dateParts(end)
  if (!startDate || !endDate) return 0
  const from = Date.parse(`${start}T00:00:00Z`)
  const to = Date.parse(`${end}T00:00:00Z`)
  const nights = Math.round((to - from) / 86400000)
  return Number.isFinite(nights) && nights >= 0 ? nights : 0
}

/** Arrival (endDate) must be >= departure (startDate). ISO YYYY-MM-DD lexicographic compare. */
export function isDateRangeOrdered(startDate: string, endDate: string): boolean {
  if (!isIsoDate(startDate) || !isIsoDate(endDate)) return true
  return endDate >= startDate
}

export function dateRangeOrderError(startDate: string, endDate: string, rowLabel = "Выезд"): string | null {
  if (!startDate && !endDate) return null
  if (!isIsoDate(startDate) || !isIsoDate(endDate)) return null
  if (endDate < startDate) {
    return `${rowLabel}: дата прибытия (${endDate}) не может быть раньше даты отправления (${startDate})`
  }
  return null
}

/** First inverted range error in a dates table, or null. */
export function datesTableRangeError(table: DatesTable): string | null {
  for (let i = 0; i < table.rows.length; i++) {
    const row = table.rows[i]
    const err = dateRangeOrderError(row.startDate, row.endDate, `Выезд ${i + 1}`)
    if (err) return err
  }
  return null
}

export function hasDatesTable(table: DatesTable): boolean {
  return table.rows.length > 0
}

export type MonthKey = string // YYYY-MM
export type DecadeKey = "first" | "second" | "third" // 1-10, 11-20, 21-31
export type HalfKey = "firstHalf" | "secondHalf" // 1-15, 16-31

const MONTH_NAMES_RU = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
]

export function monthKeyOf(isoDate: string): MonthKey {
  if (!isIsoDate(isoDate)) return ""
  return isoDate.slice(0, 7)
}

export function monthLabelOf(monthKey: MonthKey): string {
  if (!/^\d{4}-\d{2}$/.test(monthKey)) return monthKey
  const [year, month] = monthKey.split("-")
  return `${MONTH_NAMES_RU[Number(month) - 1]} ${year}`
}

export function firstDayOfMonth(monthKey: MonthKey): string {
  if (!/^\d{4}-\d{2}$/.test(monthKey)) return ""
  return `${monthKey}-01`
}

export function lastDayOfMonth(monthKey: MonthKey): string {
  if (!/^\d{4}-\d{2}$/.test(monthKey)) return ""
  const [y, m] = monthKey.split("-").map(Number)
  const last = new Date(y, m, 0).getDate()
  return `${monthKey}-${String(last).padStart(2, "0")}`
}

export function decadeStart(monthKey: MonthKey, decade: DecadeKey): string {
  if (!/^\d{4}-\d{2}$/.test(monthKey)) return ""
  if (decade === "first") return `${monthKey}-01`
  if (decade === "second") return `${monthKey}-11`
  return `${monthKey}-21`
}

export function decadeEnd(monthKey: MonthKey, decade: DecadeKey): string {
  if (!/^\d{4}-\d{2}$/.test(monthKey)) return ""
  if (decade === "first") return `${monthKey}-10`
  if (decade === "second") return `${monthKey}-20`
  return lastDayOfMonth(monthKey)
}

export function halfStart(monthKey: MonthKey, half: HalfKey): string {
  if (!/^\d{4}-\d{2}$/.test(monthKey)) return ""
  return half === "firstHalf" ? `${monthKey}-01` : `${monthKey}-16`
}

export function halfEnd(monthKey: MonthKey, half: HalfKey): string {
  if (!/^\d{4}-\d{2}$/.test(monthKey)) return ""
  return half === "firstHalf" ? `${monthKey}-15` : lastDayOfMonth(monthKey)
}

export function decadeLabel(decade: DecadeKey): string {
  if (decade === "first") return "1–10"
  if (decade === "second") return "11–20"
  return "21–31"
}

export function halfLabel(half: HalfKey): string {
  return half === "firstHalf" ? "1–15" : "16–31"
}

export type AvailableMonth = {
  key: MonthKey
  label: string
  firstDay: string
  lastDay: string
  hasFirst: boolean
  hasSecond: boolean
  hasThird: boolean
  hasFirstHalf: boolean
  hasSecondHalf: boolean
}

export function collectAvailableMonths(tables: DatesTable[], today = todayIso()): AvailableMonth[] {
  const byKey = new Map<MonthKey, AvailableMonth>()
  for (const table of tables) {
    for (const row of upcomingRows(table.rows, today)) {
      const start = row.startDate
      if (!isIsoDate(start)) continue
      const mk = monthKeyOf(start)
      if (!mk) continue
      const d = Number(start.slice(8, 10))
      const existing = byKey.get(mk)
      if (!existing) {
        byKey.set(mk, {
          key: mk,
          label: monthLabelOf(mk),
          firstDay: firstDayOfMonth(mk),
          lastDay: lastDayOfMonth(mk),
          hasFirst: d <= 10,
          hasSecond: d >= 11 && d <= 20,
          hasThird: d >= 21,
          hasFirstHalf: d <= 15,
          hasSecondHalf: d >= 16,
        })
      } else {
        if (d <= 10) existing.hasFirst = true
        if (d >= 11 && d <= 20) existing.hasSecond = true
        if (d >= 21) existing.hasThird = true
        if (d <= 15) existing.hasFirstHalf = true
        if (d >= 16) existing.hasSecondHalf = true
      }
    }
  }
  return [...byKey.values()].sort((a, b) => a.key.localeCompare(b.key))
}

export const DEPARTURE_RANGE_ANY = "ANY_RANGE"
export type DepartureRange =
  | { kind: "any" }
  | { kind: "month"; month: MonthKey }
  | { kind: "decade"; month: MonthKey; decade: DecadeKey }
  | { kind: "half"; month: MonthKey; half: HalfKey }
  | { kind: "custom"; start: string; end: string }

export function serializeDepartureRange(r: DepartureRange): string {
  switch (r.kind) {
    case "any": return DEPARTURE_RANGE_ANY
    case "month": return `month:${r.month}`
    case "decade": return `decade:${r.month}:${r.decade}`
    case "half": return `half:${r.month}:${r.half}`
    case "custom": return `custom:${r.start}:${r.end}`
  }
}

export function deserializeDepartureRange(raw: string): DepartureRange {
  if (!raw || raw === DEPARTURE_RANGE_ANY) return { kind: "any" }
  if (raw.startsWith("month:")) {
    const m = raw.slice(6)
    return /^\d{4}-\d{2}$/.test(m) ? { kind: "month", month: m } : { kind: "any" }
  }
  if (raw.startsWith("decade:")) {
    const [, m, d] = raw.split(":")
    if (/^\d{4}-\d{2}$/.test(m) && (d === "first" || d === "second" || d === "third")) {
      return { kind: "decade", month: m, decade: d as DecadeKey }
    }
    return { kind: "any" }
  }
  if (raw.startsWith("half:")) {
    const [, m, h] = raw.split(":")
    if (/^\d{4}-\d{2}$/.test(m) && (h === "firstHalf" || h === "secondHalf")) {
      return { kind: "half", month: m, half: h as HalfKey }
    }
    return { kind: "any" }
  }
  if (raw.startsWith("custom:")) {
    const parts = raw.slice(7).split(":")
    const start = isIsoDate(parts[0]) ? parts[0] : ""
    const end = isIsoDate(parts[1]) ? parts[1] : ""
    return { kind: "custom", start, end }
  }
  return { kind: "any" }
}

export function departureRangeBounds(r: DepartureRange): { start: string; end: string } {
  switch (r.kind) {
    case "any": return { start: "", end: "" }
    case "month": return { start: firstDayOfMonth(r.month), end: lastDayOfMonth(r.month) }
    case "decade": return { start: decadeStart(r.month, r.decade), end: decadeEnd(r.month, r.decade) }
    case "half": return { start: halfStart(r.month, r.half), end: halfEnd(r.month, r.half) }
    case "custom": return { start: r.start, end: r.end }
  }
}

export function departureRangeLabel(r: DepartureRange): string {
  switch (r.kind) {
    case "any": return ALL_PERIODS_LABEL
    case "month": return monthLabelOf(r.month)
    case "decade": return `${monthLabelOf(r.month)}, ${decadeLabel(r.decade)}`
    case "half": return `${monthLabelOf(r.month)}, ${halfLabel(r.half)}`
    case "custom":
      if (!r.start && !r.end) return ALL_PERIODS_LABEL
      return formatDateRange(r.start, r.end) || ALL_PERIODS_LABEL
  }
}

export function tourMatchesDepartureRangeSelection(
  table: DatesTable,
  r: DepartureRange,
  today = todayIso(),
): boolean {
  const { start, end } = departureRangeBounds(r)
  if (!start && !end) return true
  return tourMatchesDepartureRange(table, start, end, today)
}
