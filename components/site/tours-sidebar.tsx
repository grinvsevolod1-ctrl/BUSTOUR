"use client"

import { useMemo } from "react"
import { parseShortcodes } from "@/lib/parse-shortcodes"
import { CatalogSidebar, type CatalogSidebarCountry } from "./catalog/catalog-sidebar"

type City = { slug: string; name: string }

export function ToursSidebar({
  options,
  value,
  onSelect,
  citiesByCountry = {},
  activeCitySlug,
  cityBasePath = "/tours/bus",
  countrySlugs = {},
  countryBasePath,
  shortcodesDict = {},
}: {
  options: string[]
  value: string
  onSelect: (value: string) => void
  citiesByCountry?: Record<string, City[]>
  activeCitySlug?: string
  cityBasePath?: string
  countrySlugs?: Record<string, string>
  countryBasePath?: string
  /** Display-only shortcode expansion for labels (keys/onSelect stay raw). */
  shortcodesDict?: Record<string, string>
}) {
  const allCountrySlugs = useMemo(() => new Set(Object.values(countrySlugs)), [countrySlugs])
  const cityRootPath = useMemo(() => {
    const baseParts = cityBasePath.split("/")
    const lastBasePart = baseParts[baseParts.length - 1]
    return allCountrySlugs.size > 0 && allCountrySlugs.has(lastBasePart)
      ? baseParts.slice(0, -1).join("/")
      : cityBasePath
  }, [cityBasePath, allCountrySlugs])

  const items = useMemo<CatalogSidebarCountry[]>(
    () =>
      options.map((option) => {
        const cities = citiesByCountry[option] ?? []
        const countrySlug = countrySlugs[option]
        const countryHref =
          countrySlug && countryBasePath ? `${countryBasePath}/${countrySlug}/` : undefined
        return {
          key: option,
          label: parseShortcodes(option, shortcodesDict),
          href: countryHref,
          fallback: "button" as const,
          isActive: option === value && !activeCitySlug,
          onSelect: () => onSelect(option),
          cities: cities.map((city) => ({
            key: city.slug,
            label: parseShortcodes(city.name, shortcodesDict),
            href: countrySlug
              ? `${cityRootPath}/${countrySlug}/${city.slug}/`
              : `${cityBasePath}/${city.slug}/`,
            isActive: city.slug === activeCitySlug,
          })),
        }
      }),
    [
      options,
      value,
      onSelect,
      citiesByCountry,
      activeCitySlug,
      cityBasePath,
      countrySlugs,
      countryBasePath,
      cityRootPath,
      shortcodesDict,
    ],
  )

  return <CatalogSidebar catalogKey="bus" countries={items} />
}
