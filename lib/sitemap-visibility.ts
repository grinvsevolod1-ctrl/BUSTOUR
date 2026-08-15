/**
 * CMS visibility filters for sitemap / public index surfaces.
 * Missing key = visible; explicit "0" = hidden (same as UI).
 */

export function isCmsVisible(settings: Record<string, string>, key: string): boolean {
  return settings[key] !== "0"
}

export function filterCountriesForSitemap<T extends { slug: string; category: string }>(
  countries: T[],
  settings: Record<string, string>,
): T[] {
  return countries.filter((c) =>
    isCmsVisible(settings, `country:${c.category}:${c.slug}.visible`),
  )
}

export function filterCitiesForSitemap<T extends { slug: string; category: string }>(
  cities: T[],
  settings: Record<string, string>,
): T[] {
  return cities.filter((c) => isCmsVisible(settings, `city:${c.category}:${c.slug}.visible`))
}
