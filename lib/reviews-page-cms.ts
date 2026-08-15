import type { SiteSettings } from "@/lib/types"

/** Canonical CMS prefix for `/testimonials` (admin `/admin/reviews`). */
export const REVIEWS_PAGE_CMS_KEY = "reviews" as const
/** Legacy alias — texts/FAQ were also edited under `/admin/pages/testimonials`. */
export const REVIEWS_PAGE_LEGACY_CMS_KEY = "testimonials" as const

export const REVIEWS_PAGE_DEFAULT_SECTION_ORDER = ["faq", "callus"] as const

function parseOrder(raw: string | undefined): string[] | null {
  if (!raw) return null
  try {
    const value: unknown = JSON.parse(raw)
    return Array.isArray(value) ? value.filter((k): k is string => typeof k === "string") : null
  } catch {
    return null
  }
}

/**
 * Prefer `reviews.*` (admin section manager), fall back to `testimonials.*`.
 * Default matches admin reviews PageSectionsManager (`faq` then `callus`).
 */
export function resolveReviewsPageSectionOrder(settings: SiteSettings): string[] {
  return (
    parseOrder(settings[`${REVIEWS_PAGE_CMS_KEY}.sections.order`]) ??
    parseOrder(settings[`${REVIEWS_PAGE_LEGACY_CMS_KEY}.sections.order`]) ??
    [...REVIEWS_PAGE_DEFAULT_SECTION_ORDER]
  )
}

/** Prefix that owns the saved order (or canonical when none saved). */
export function resolveReviewsPageCmsPrefix(
  settings: SiteSettings,
): typeof REVIEWS_PAGE_CMS_KEY | typeof REVIEWS_PAGE_LEGACY_CMS_KEY {
  if (settings[`${REVIEWS_PAGE_CMS_KEY}.sections.order`]) return REVIEWS_PAGE_CMS_KEY
  if (settings[`${REVIEWS_PAGE_LEGACY_CMS_KEY}.sections.order`]) return REVIEWS_PAGE_LEGACY_CMS_KEY
  return REVIEWS_PAGE_CMS_KEY
}
