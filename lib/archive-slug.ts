/** Free unique slug when soft-deleting so a new live row can reuse the original URL. */
export function toArchivedSlug(slug: string, at = Date.now()): string {
  if (/-archived-\d+$/.test(slug)) return slug
  return `${slug}-archived-${at}`
}

/** Undo archive suffix for cleanup of settings / content keyed by the live slug. */
export function stripArchivedSuffix(slug: string): string {
  return slug.replace(/-archived-\d+$/, "")
}
