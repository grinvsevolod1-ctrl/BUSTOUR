/**
 * Hot page sidebar data.
 *
 * Countries are stored in the shared `countries` table.
 * City-level entries for the hot sidebar use `city_destinations` with category="hot".
 *
 * The sidebar shows countries as top-level items.
 * - If a country has hot cities, they appear as expandable sub-items.
 * - If a country has a single hot city whose name matches the country name
 *   (i.e. it's a "standalone" entry with no real sub-cities), the country
 *   is shown as a plain top-level link with no nesting.
 */

import { getCitiesByCountry } from "@/lib/cities"
import { getCountries, getCountrySlugs } from "@/lib/countries"

export type HotSidebarData = {
  /** country name → [{slug, name}] for nested items (empty = standalone top-level link) */
  citiesByCountry: Record<string, { slug: string; name: string }[]>
  /** country name → country slug for country-level links */
  countrySlugs: Record<string, string>
  /** ordered list of country names to display (countries with ≥1 hot city OR standalone) */
  countryNames: string[]
}

export async function getHotSidebarData(settings?: Record<string, string>): Promise<HotSidebarData> {
  const [rawCitiesByCountry, countrySlugs, hotCountries] = await Promise.all([
    getCitiesByCountry("hot", settings),
    getCountrySlugs("hot"),
    getCountries("hot"),
  ])

  // Strip "standalone" cities: a city is standalone if it shares the same name
  // as its parent country. In that case, the country becomes a plain top-level link
  // (no expansion needed — the country-level page IS the destination).
  const citiesByCountry: Record<string, { slug: string; name: string }[]> = {}
  for (const [countryName, cities] of Object.entries(rawCitiesByCountry)) {
    const countrySlug = countrySlugs[countryName]
    const countryVisible = !settings || !countrySlug || settings[`country:hot:${countrySlug}.visible`] !== "0"
    
    // Skip cities if country is hidden
    if (!countryVisible) {
      citiesByCountry[countryName] = []
      continue
    }
    
    const nonStandalone = cities.filter(
      (c) => c.name.trim().toLowerCase() !== countryName.trim().toLowerCase(),
    )
    citiesByCountry[countryName] = nonStandalone
  }

  // CMS country.sortOrder (hotCountries), NOT city iteration / Object.keys order.
  const countryNames = orderHotSidebarCountryNames({
    hotCountries,
    rawCitiesByCountry,
    settings,
  })

  for (const name of countryNames) {
    if (!(name in citiesByCountry)) citiesByCountry[name] = []
    const match = hotCountries.find((c) => c.name === name)
    if (match) countrySlugs[name] ??= match.slug
  }

  return { citiesByCountry, countrySlugs, countryNames }
}

/** Pure: sidebar country order = getCountries("hot") sortOrder, then orphan city countries. */
export function orderHotSidebarCountryNames(input: {
  hotCountries: { name: string; slug: string }[]
  rawCitiesByCountry: Record<string, unknown[]>
  settings?: Record<string, string>
}): string[] {
  const names: string[] = []
  for (const c of input.hotCountries) {
    if (input.settings?.[`country:hot:${c.slug}.visible`] === "0") continue
    names.push(c.name)
  }
  const known = new Set(input.hotCountries.map((c) => c.name))
  for (const name of Object.keys(input.rawCitiesByCountry)) {
    if (known.has(name) || names.includes(name)) continue
    if ((input.rawCitiesByCountry[name] ?? []).length === 0) continue
    names.push(name)
  }
  return names
}
