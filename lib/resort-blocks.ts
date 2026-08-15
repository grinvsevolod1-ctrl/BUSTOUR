/** Page-scoped resort tables win; empty → legacy/shared `global` blocks (#106). */
export function pickResortBlocksForPage<T>(pageBlocks: T[], globalBlocks: T[]): T[] {
  return pageBlocks.length > 0 ? pageBlocks : globalBlocks
}

export const RESORT_GLOBAL_PAGE = "global" as const
