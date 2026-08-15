/** Row-aware review text clamp: all text-only → 4 lines; mixed with taller (media) → fit slot. */

export const REVIEW_CLAMP_BASE_LINES = 4

export function resolveLineHeightPx(lineHeight: string, fontSizePx: number): number {
  const n = Number.parseFloat(lineHeight)
  if (Number.isFinite(n) && lineHeight.trim().endsWith("px")) return n
  if (Number.isFinite(n) && n > 0 && n < 10) return n * fontSizePx // unitless multiplier
  return Math.max(1, fontSizePx * 1.625) // leading-relaxed fallback
}

/** Pure policy for how many lines a card body may show. */
export function reviewClampLines(input: {
  expanded: boolean
  rowHasMedia: boolean
  slotHeightPx: number
  lineHeightPx: number
}): number | null {
  if (input.expanded) return null
  if (!input.rowHasMedia) return REVIEW_CLAMP_BASE_LINES
  const lh = input.lineHeightPx > 0 ? input.lineHeightPx : 24
  // Fill stretched text slot next to media cards; never below base floor.
  return Math.max(REVIEW_CLAMP_BASE_LINES, Math.floor(input.slotHeightPx / lh))
}

export function applyReviewBodyClamp(el: HTMLElement, lines: number | null): void {
  if (lines == null) {
    el.style.removeProperty("display")
    el.style.removeProperty("overflow")
    el.style.removeProperty("-webkit-box-orient")
    el.style.removeProperty("-webkit-line-clamp")
    el.style.removeProperty("line-clamp")
    return
  }
  el.style.display = "-webkit-box"
  el.style.overflow = "hidden"
  el.style.setProperty("-webkit-box-orient", "vertical")
  el.style.webkitLineClamp = String(lines)
  el.style.setProperty("line-clamp", String(lines))
}

function groupByRow(cards: HTMLElement[]): HTMLElement[][] {
  const rows: { top: number; cards: HTMLElement[] }[] = []
  for (const card of cards) {
    const top = Math.round(card.getBoundingClientRect().top)
    const hit = rows.find((r) => Math.abs(r.top - top) < 4)
    if (hit) hit.cards.push(card)
    else rows.push({ top, cards: [card] })
  }
  return rows.map((r) => r.cards)
}

/** Measure grid rows and set per-card -webkit-line-clamp. */
export function syncReviewRowClamps(grid: HTMLElement): void {
  const cards = [...grid.querySelectorAll<HTMLElement>("[data-review-card]")]
  if (!cards.length) return

  for (const row of groupByRow(cards)) {
    const rowHasMedia = row.some((c) => c.dataset.hasMedia === "1")
    for (const card of row) {
      const body = card.querySelector<HTMLElement>("[data-review-body]")
      const slot = card.querySelector<HTMLElement>("[data-review-text-slot]")
      if (!body || !slot) continue

      const expanded = card.dataset.expanded === "1"
      const cs = getComputedStyle(body)
      const fontSize = Number.parseFloat(cs.fontSize) || 16
      const lineHeightPx = resolveLineHeightPx(cs.lineHeight, fontSize)
      const lines = reviewClampLines({
        expanded,
        rowHasMedia,
        slotHeightPx: slot.clientHeight,
        lineHeightPx,
      })
      applyReviewBodyClamp(body, lines)
      body.dataset.clampLines = lines == null ? "" : String(lines)
    }
  }
}
