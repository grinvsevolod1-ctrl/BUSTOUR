/** CMS layout for «Карточки курортов» grid / pagination. */
export type ResortCardsLayout = {
  /** Visible grid rows per page (1 or 2). */
  rows: 1 | 2
  /** When false, render all cards (legacy full grid). */
  paginate: boolean
}

export function resolveResortCardsLayout(
  settings: Record<string, string>,
  prefix?: string,
): ResortCardsLayout {
  const key = (suffix: string) => (prefix ? `${prefix}.${suffix}` : suffix)
  const rows: 1 | 2 = settings[key("cities.rows")] === "1" ? 1 : 2
  const paginate = (settings[key("cities.paginate")] ?? "1") !== "0"
  return { rows, paginate }
}

/** Page size = columns × rows (columns follow Tailwind sm/lg breakpoints). */
export function resortCardsPageSize(cols: number, rows: 1 | 2): number {
  return Math.max(1, cols) * rows
}
