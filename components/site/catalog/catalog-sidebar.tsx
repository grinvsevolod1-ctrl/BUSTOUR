"use client"

import { useMemo } from "react"
import Link from "next/link"
import { ChevronDown, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { useCatalogSidebarExpanded } from "./use-catalog-sidebar-expanded"

export type CatalogSidebarCity = {
  key: string
  label: string
  href: string
  isActive: boolean
}

export type CatalogSidebarCountry = {
  key: string
  label: string
  /** Link href; omit for button/span fallback */
  href?: string
  isActive: boolean
  cities: CatalogSidebarCity[]
  /** Called when country label is activated (link or button) */
  onSelect?: () => void
  /** When no href: "button" (filter) or "span" (non-interactive) */
  fallback?: "button" | "span"
}

type Props = {
  catalogKey: string
  countries: CatalogSidebarCountry[]
}

export function CatalogSidebar({ catalogKey, countries }: Props) {
  const seedOpen = useMemo(
    () =>
      countries
        .filter((c) => c.isActive || c.cities.some((city) => city.isActive))
        .map((c) => c.key),
    [countries],
  )
  const { expanded, toggleExpanded } = useCatalogSidebarExpanded(catalogKey, seedOpen)

  return (
    <nav aria-label="Направления" className="hidden w-full shrink-0 md:block md:w-[212px]">
      <ul>
        {countries.map((country) => {
          const hasCities = country.cities.length > 0
          const isOpen = !!expanded[country.key]
          const fallback = country.fallback ?? "span"

          return (
            <li key={country.key}>
              <div className="flex items-center border-b border-line">
                {hasCities ? (
                  <button
                    type="button"
                    onClick={() => toggleExpanded(country.key)}
                    aria-expanded={isOpen}
                    className={cn(
                      "flex shrink-0 items-center py-4 pl-2 pr-1 transition-colors",
                      country.isActive ? "text-cyan-accent" : "text-ink-muted hover:text-cyan-accent",
                    )}
                  >
                    <ChevronDown
                      className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")}
                      aria-hidden
                    />
                  </button>
                ) : (
                  <span className="flex shrink-0 items-center py-4 pl-2 pr-1">
                    <ChevronRight
                      className={cn(
                        "h-4 w-4",
                        country.isActive ? "text-cyan-accent" : "text-ink-muted",
                      )}
                      aria-hidden
                    />
                  </span>
                )}

                {country.href ? (
                  <Link
                    href={country.href}
                    aria-current={country.isActive ? "true" : undefined}
                    onClick={() => country.onSelect?.()}
                    className={cn(
                      "flex-1 py-4 pr-2 text-left text-base transition-colors",
                      country.isActive ? "text-cyan-accent" : "text-ink hover:text-cyan-accent",
                    )}
                  >
                    {country.label}
                  </Link>
                ) : fallback === "button" ? (
                  <button
                    type="button"
                    onClick={() => country.onSelect?.()}
                    aria-current={country.isActive ? "true" : undefined}
                    className={cn(
                      "flex-1 py-4 pr-2 text-left text-base transition-colors",
                      country.isActive ? "text-cyan-accent" : "text-ink hover:text-cyan-accent",
                    )}
                  >
                    {country.label}
                  </button>
                ) : (
                  <span className="flex-1 py-4 pr-2 text-base text-ink">{country.label}</span>
                )}
              </div>

              {hasCities && isOpen && (
                <ul>
                  {country.cities.map((city) => (
                    <li key={city.key}>
                      <Link
                        href={city.href}
                        aria-current={city.isActive ? "true" : undefined}
                        className={cn(
                          "flex items-center border-b border-line py-4 pl-9 pr-2 text-base transition-colors",
                          city.isActive ? "text-cyan-accent" : "text-ink hover:text-cyan-accent",
                        )}
                      >
                        {city.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
