/** Default public URL prefix for avia tours branch (`settings["aviatory.slug"]`). */
export const DEFAULT_AVIA_SLUG = "aviatury"

/** Internal Next.js route folder — never the public default. */
export const AVIA_INTERNAL_PREFIX = "aviatory"

/**
 * Public path segment for the avia branch.
 * Empty or legacy `"aviatory"` → `aviatury`. Custom values pass through.
 */
export function resolveAviaSlug(raw: string | null | undefined): string {
  const s = (raw || "").trim()
  if (!s || s === AVIA_INTERNAL_PREFIX) return DEFAULT_AVIA_SLUG
  return s
}
