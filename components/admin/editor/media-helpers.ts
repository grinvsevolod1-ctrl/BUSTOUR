export type MediaAlignment = "left" | "center" | "right" | "full"

export const mediaAlignments: MediaAlignment[] = ["left", "center", "right", "full"]

export function normalizeMediaWidth(value: string | null | undefined): string | null {
  const normalized = value?.trim().toLowerCase() ?? ""
  const match = normalized.match(/^(\d+(?:\.\d+)?)(px|%)$/)
  if (!match || Number(match[1]) <= 0) return null
  return `${Number(match[1])}${match[2]}`
}

export function clampMediaColumns(value: number | string | null | undefined): 2 | 3 | 4 {
  const columns = Number(value)
  if (!Number.isFinite(columns)) return 3
  return Math.max(2, Math.min(4, Math.round(columns))) as 2 | 3 | 4
}

/** Empty chooser cell (no media/text started). */
export function isChooserMediaGridCell(cell: {
  type: { name: string }
  childCount: number
}): boolean {
  return cell.type.name === "mediaGridCell" && cell.childCount === 0
}

/**
 * Pad only the first row with empties. Beyond the first row, never auto-add
 * multiple empty slots — user adds one empty at a time via «+ Элемент».
 */
export function gridTrailingSlots(childCount: number, columns: number): number {
  const cols = clampMediaColumns(columns)
  if (childCount <= 0) return cols
  if (childCount < cols) return cols - childCount
  return 0
}

/** Target cell count after stripping trailing empties and padding for `columns`. */
export function gridChildCountForColumns(keptCount: number, columns: number): number {
  const cols = clampMediaColumns(columns)
  return keptCount + gridTrailingSlots(keptCount, cols)
}

/**
 * «+ Элемент» is active only when the first row is fully filled and there is
 * no free empty chooser anywhere (at most one empty outside row 1, and only
 * after the user adds it).
 */
export function canAddMediaGridElement(
  cells: Array<{ type: { name: string }; childCount: number }>,
  columns: number | string | null | undefined,
): boolean {
  const cols = clampMediaColumns(columns)
  if (cells.length < cols) return false
  for (let i = 0; i < cells.length; i++) {
    if (isChooserMediaGridCell(cells[i]!)) return false
  }
  return true
}

export function isMediaGridFirstRowIndex(
  index: number,
  columns: number | string | null | undefined,
): boolean {
  return index >= 0 && index < clampMediaColumns(columns)
}

/** TipTap JSON for one empty row of cells. */
export function emptyGridRow(columns: number | string | null | undefined) {
  const cols = clampMediaColumns(columns)
  return Array.from({ length: cols }, () => ({ type: "mediaGridCell" as const }))
}

export function alignmentClass(alignment: MediaAlignment | null | undefined): string {
  return `seo-align-${alignment && mediaAlignments.includes(alignment) ? alignment : "center"}`
}

export function parseMediaAlignment(element: Element): MediaAlignment {
  const className = Array.from(element.classList).find((name) => name.startsWith("seo-align-"))
  const value = element.getAttribute("data-align") ?? className?.replace("seo-align-", "")
  return mediaAlignments.includes(value as MediaAlignment) ? (value as MediaAlignment) : "left"
}

export function parseMediaWidth(element: Element): string | null {
  return normalizeMediaWidth(element.getAttribute("width") ?? (element as HTMLElement).style.width)
}

export function normalizeMediaHeight(value: string | null | undefined): string | null {
  const normalized = value?.trim().toLowerCase() ?? ""
  const match = normalized.match(/^(\d+(?:\.\d+)?)(px)$/)
  if (!match || Number(match[1]) <= 0) return null
  return `${Number(match[1])}${match[2]}`
}

export function parseMediaHeight(element: Element): string | null {
  return normalizeMediaHeight(element.getAttribute("height") ?? (element as HTMLElement).style.height)
}

export function mediaStyle(width: string | null | undefined, height: string | null | undefined): string | undefined {
  const styles = [
    width ? `width:${width}` : "",
    height ? `height:${height}` : "",
  ].filter(Boolean)
  return styles.length ? styles.join(";") : undefined
}
