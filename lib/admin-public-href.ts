import { DEFAULT_AVIA_SLUG, resolveAviaSlug } from "@/lib/avia-slug"
import { DEFAULT_HOT_HREF, resolveHotPublicHref } from "@/lib/hot-slug"

export type TourBranch = "bus" | "avia" | "hot"

/** Public path segment for a tour branch (no leading/trailing slash). */
export function branchPublicPrefix(
  category: TourBranch,
  aviaSlugRaw?: string | null,
): string {
  if (category === "hot") return "hot"
  if (category === "bus") return "avtobusnye-tury"
  return resolveAviaSlug(aviaSlugRaw)
}

/** Admin «Открыть» for hot home — always `/hot/`, never settings["hot.slug"]. */
export function adminHotHomeHref(rawHotSlug?: string | null): string {
  return resolveHotPublicHref(rawHotSlug)
}

/** Admin «Открыть» for avia home — public prefix from settings["aviatory.slug"]. */
export function adminAviaHomeHref(rawAviaSlug?: string | null): string {
  return `/${resolveAviaSlug(rawAviaSlug)}/`
}

export function adminBusHomeHref(): string {
  return "/avtobusnye-tury/"
}

/**
 * Country page open link.
 * Avia may use settings `country:avia:{slug}.pageSlug` override when present.
 */
export function adminCountryOpenHref(opts: {
  category: TourBranch
  countrySlug: string
  aviaSlugRaw?: string | null
  pageSlugOverride?: string | null
}): string {
  const live = opts.countrySlug.trim()
  const pathSlug =
    opts.category === "avia"
      ? (opts.pageSlugOverride?.trim() || live)
      : live
  const prefix = branchPublicPrefix(opts.category, opts.aviaSlugRaw)
  return `/${prefix}/${pathSlug}/`
}

/** City page open link (countrySlug may be `_` when unknown). */
export function adminCityOpenHref(opts: {
  category: TourBranch
  countrySlug: string
  citySlug: string
  aviaSlugRaw?: string | null
}): string {
  const prefix = branchPublicPrefix(opts.category, opts.aviaSlugRaw)
  const country = opts.countrySlug.trim() || "_"
  const city = opts.citySlug.trim()
  return `/${prefix}/${country}/${city}/`
}

/** Default avia prefix used in static admin-config URLs (no DB). */
export const ADMIN_CONFIG_AVIA_PREFIX = DEFAULT_AVIA_SLUG

export { DEFAULT_HOT_HREF }
