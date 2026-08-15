/**
 * Centralised URL builder for tour pages.
 *
 * Canonical: /avtobusnye-tury/{countrySlug}/{citySlug}/{tourSlug}/
 * Returns null when any slug missing — never invents "unknown".
 */
export function tourUrl(opts: {
  tourSlug: string
  countrySlug?: string | null
  citySlug?: string | null
}): string | null {
  const tourSlug = (opts.tourSlug || "").trim()
  const country = (opts.countrySlug || "").trim()
  const city = (opts.citySlug || "").trim()
  if (!tourSlug || !country || !city) return null
  return `/avtobusnye-tury/${country}/${city}/${tourSlug}/`
}
