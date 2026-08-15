"use client"

import { useMemo } from "react"
import { parseShortcodes } from "@/lib/parse-shortcodes"
import { CatalogSidebar, type CatalogSidebarCountry } from "./catalog/catalog-sidebar"

type City = { slug: string; name: string }

type Props = {
  countryNames: string[]
  citiesByCountry: Record<string, City[]>
  countrySlugs: Record<string, string>
  activeCountrySlug?: string
  activeCitySlug?: string
  /** Display-only shortcode expansion for labels (keys stay raw). */
  shortcodesDict?: Record<string, string>
}

export function HotSidebar({
  countryNames,
  citiesByCountry,
  countrySlugs,
  activeCountrySlug,
  activeCitySlug,
  shortcodesDict = {},
}: Props) {
  const items = useMemo<CatalogSidebarCountry[]>(
    () =>
      countryNames.map((countryName) => {
        const cities = citiesByCountry[countryName] ?? []
        const countrySlug = countrySlugs[countryName]
        return {
          key: countryName,
          label: parseShortcodes(countryName, shortcodesDict),
          href: countrySlug ? `/hot/${countrySlug}/` : undefined,
          fallback: "span" as const,
          isActive: countrySlug === activeCountrySlug && !activeCitySlug,
          cities: cities.map((city) => ({
            key: city.slug,
            label: parseShortcodes(city.name, shortcodesDict),
            href: `/hot/${countrySlug || "_"}/${city.slug}/`,
            isActive: city.slug === activeCitySlug,
          })),
        }
      }),
    [countryNames, citiesByCountry, countrySlugs, activeCountrySlug, activeCitySlug, shortcodesDict],
  )

  return <CatalogSidebar catalogKey="hot" countries={items} />
}
