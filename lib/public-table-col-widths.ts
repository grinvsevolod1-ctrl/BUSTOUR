/**
 * Public (site) table column width settings — hug | fill | fixed (+ min/max).
 * Not for admin CRUD table chrome.
 */

import type { CSSProperties } from "react"

export type PublicColWidthMode = "hug" | "fill" | "fixed"

export type PublicColWidth = {
  mode: PublicColWidthMode
  /** CSS px */
  minPx?: number
  maxPx?: number
  /** Used when mode === "fixed" */
  widthPx?: number
}

export type PublicColWidthsMap = Record<string, PublicColWidth>

const MODES = new Set<PublicColWidthMode>(["hug", "fill", "fixed"])

function clampPx(n: unknown): number | undefined {
  if (typeof n !== "number" || !Number.isFinite(n)) return undefined
  const v = Math.round(n)
  if (v < 0) return undefined
  return Math.min(v, 2000)
}

export function parsePublicColWidths(raw?: string | null): PublicColWidthsMap {
  if (!raw?.trim()) return {}
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {}
    const out: PublicColWidthsMap = {}
    for (const [id, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (!value || typeof value !== "object" || Array.isArray(value)) continue
      const row = value as Record<string, unknown>
      const mode = row.mode
      if (typeof mode !== "string" || !MODES.has(mode as PublicColWidthMode)) continue
      const m = mode as PublicColWidthMode
      const base: PublicColWidth = { mode: m }
      // Per-mode sanitize — drop fields irrelevant to the mode so the admin
      // UI and public renderer always see a consistent, contract-clean shape.
      if (m === "fixed") {
        const widthPx = clampPx(row.widthPx) ?? clampPx(row.minPx)
        if (widthPx != null) base.widthPx = widthPx
      } else if (m === "hug") {
        const minPx = clampPx(row.minPx)
        if (minPx != null) base.minPx = minPx
        // maxPx intentionally dropped for hug — it defeats white-space:nowrap
        // sizing and clips booking CTAs (see L80 comment in publicColStyle).
      } else {
        // fill — keep min/max; widthPx is meaningless
        const minPx = clampPx(row.minPx)
        const maxPx = clampPx(row.maxPx)
        if (minPx != null) base.minPx = minPx
        if (maxPx != null) base.maxPx = maxPx
      }
      out[id] = base
    }
    return out
  } catch {
    return {}
  }
}

export function serializePublicColWidths(map: PublicColWidthsMap): string {
  return JSON.stringify(map)
}

export function resolveTableColWidths(
  stored: unknown,
  count: number,
): PublicColWidthsMap {
  const parsed = parsePublicColWidths(
    typeof stored === "string" ? stored : stored ? JSON.stringify(stored) : null,
  )
  return Object.fromEntries(
    Array.from({ length: count }, (_, index) => [
      String(index),
      parsed[String(index)] ?? { mode: "fill", minPx: 140 },
    ]),
  )
}

/** Inline style for <col>/<th>/<td> on the public site. */
export function publicColStyle(w?: PublicColWidth): CSSProperties {
  if (!w) return {}
  if (w.mode === "hug") {
    // Shrink-wrap to content + cell padding. Never emit maxWidth — under
    // nowrap that capped the column and clipped the booking CTA.
    const out: CSSProperties = {
      width: "1%",
      whiteSpace: "nowrap",
    }
    if (w.minPx != null) out.minWidth = w.minPx
    return out
  }
  if (w.mode === "fixed") {
    // Single source of truth: widthPx. Old rows from before sanitize can
    // still carry minPx/maxPx — ignore them, lock the 3 width props to the
    // same exact value so table layout stays deterministic.
    const width = w.widthPx ?? w.minPx
    if (width == null) return {}
    return {
      width,
      minWidth: width,
      maxWidth: width,
    }
  }
  // fill — take leftover space when siblings are hug/fixed
  const out: CSSProperties = { width: "auto" }
  if (w.minPx != null) out.minWidth = w.minPx
  if (w.maxPx != null) out.maxWidth = w.maxPx
  return out
}

/** Transfer schedule desktop columns (public). */
export const TRANSFER_SCHEDULE_COL_IDS = ["departure", "arrival", "note", "booking"] as const
export type TransferScheduleColId = (typeof TRANSFER_SCHEDULE_COL_IDS)[number]

export const TRANSFER_SCHEDULE_COL_LABELS: Record<TransferScheduleColId, string> = {
  departure: "Отправление",
  arrival: "Прибытие",
  note: "Примечание",
  booking: "Бронь",
}

export const DEFAULT_TRANSFER_SCHEDULE_COL_WIDTHS: Record<TransferScheduleColId, PublicColWidth> = {
  departure: { mode: "fill", minPx: 112 },
  arrival: { mode: "fill", minPx: 112 },
  note: { mode: "fill", minPx: 192 },
  // hug with no minPx — column sizes to CTA + cell padding (no forced px width)
  booking: { mode: "hug" },
}

export function resolveTransferScheduleColWidths(
  stored?: string | null,
): Record<TransferScheduleColId, PublicColWidth> {
  const parsed = parsePublicColWidths(stored)
  // Old auto-saved defaults (hug/hug/fill/hug) broke the public table under table-fixed.
  // Treat that exact signature as "no preference" so the new fill/fill/fill/hug applies.
  if (isLegacyBrokenDefault(parsed)) {
    return { ...DEFAULT_TRANSFER_SCHEDULE_COL_WIDTHS }
  }
  return {
    departure: parsed.departure ?? DEFAULT_TRANSFER_SCHEDULE_COL_WIDTHS.departure,
    arrival: parsed.arrival ?? DEFAULT_TRANSFER_SCHEDULE_COL_WIDTHS.arrival,
    note: parsed.note ?? DEFAULT_TRANSFER_SCHEDULE_COL_WIDTHS.note,
    booking: parsed.booking ?? DEFAULT_TRANSFER_SCHEDULE_COL_WIDTHS.booking,
  }
}

/** Exact previous defaults that crushed layout — ignore when resolving. */
function isLegacyBrokenDefault(parsed: PublicColWidthsMap): boolean {
  const d = parsed.departure
  const a = parsed.arrival
  const n = parsed.note
  const b = parsed.booking
  if (!d || !a || !n || !b) return false
  const same = (w: PublicColWidth, mode: PublicColWidthMode, min?: number) =>
    w.mode === mode && (min == null || w.minPx === min || w.minPx == null) && w.widthPx == null
  // Old content-hug defaults OR booking hug with tight 136px (CTA overflow)
  if (
    same(d, "hug", 112) &&
    same(a, "hug", 112) &&
    same(n, "fill", 192) &&
    same(b, "hug", 136) &&
    Object.keys(parsed).length === 4
  ) {
    return true
  }
  return (
    same(d, "fill", 112) &&
    same(a, "fill", 112) &&
    same(n, "fill", 192) &&
    same(b, "hug", 136) &&
    Object.keys(parsed).length === 4
  )
}
