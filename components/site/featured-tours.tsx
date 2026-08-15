"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { TourCard } from "@/components/site/tour-card"
import { tourUrl } from "@/lib/tour-url"
import type { Currency, Tour } from "@/lib/types"

const INITIAL = 4
const STEP = 4

export function FeaturedTours({
  tours,
  currencies = [],
  eagerIndex,
}: {
  tours: Tour[]
  currencies?: Currency[]
  eagerIndex?: number
}) {
  const linkable = tours.filter((t) =>
    tourUrl({ tourSlug: t.slug, countrySlug: t.countrySlug, citySlug: t.citySlug }),
  )
  const [visible, setVisible] = useState(Math.min(INITIAL, linkable.length))
  const hasMore = visible < linkable.length

  if (!linkable.length) return null

  return (
    <>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {linkable.slice(0, visible).map((tour, i) => (
          <TourCard
            key={tour.slug}
            tour={tour}
            currencies={currencies}
            loading={i === eagerIndex ? "eager" : "lazy"}
            priority={i === eagerIndex}
          />
        ))}
      </div>
      {hasMore ? (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setVisible((v) => Math.min(v + STEP, linkable.length))}
            className="inline-flex items-center gap-3 rounded border border-line px-4 py-3 text-base text-ink transition-colors hover:bg-cream"
          >
            Больше туров
            <ChevronDown className="h-4 w-4" aria-hidden />
          </button>
        </div>
      ) : null}
    </>
  )
}
