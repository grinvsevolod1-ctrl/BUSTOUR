/** Public URL for hot tours home — App Router is fixed at `/hot/`. */
export const DEFAULT_HOT_HREF = "/hot/"

/**
 * Admin "Открыть" and similar links must never follow a corrupted
 * `settings["hot.slug"]` (e.g. `hot-4` from CMS rekeys).
 */
export function resolveHotPublicHref(_raw?: string | null): string {
  return DEFAULT_HOT_HREF
}
