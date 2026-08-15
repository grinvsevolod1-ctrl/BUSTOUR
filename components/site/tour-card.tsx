import Link from "next/link"
import Image from "next/image"
import type { Tour } from "@/lib/data"
import type { Currency } from "@/lib/types"
import { tourUrl } from "@/lib/tour-url"
import { PriceSwitcher } from "./price-switcher"

export function TourCard({
  tour,
  price,
  currencies = [],
  currencyCode,
  showPerPerson = true,
  countrySlug,
  citySlug,
  loading = "lazy",
  priority = false,
  hidePerPersonSuffix = false,
  isBusTour = true,
}: {
  tour: Tour
  price?: string
  currencies?: Currency[]
  currencyCode?: string
  showPerPerson?: boolean
  countrySlug?: string | null
  citySlug?: string | null
  loading?: "eager" | "lazy"
  priority?: boolean
  hidePerPersonSuffix?: boolean
  isBusTour?: boolean
}) {
  const hasStructuredPrice = (tour as Tour & { priceAmount?: number }).priceAmount
  const effectiveIsBus = isBusTour ?? (tour as Tour & { category?: string }).category === "bus"
  const fallbackPrice = price ?? tour.price
  const cardPrice = hidePerPersonSuffix
    ? fallbackPrice.replace(/\s+за человека$/, "")
    : fallbackPrice
  const href = tourUrl({
    tourSlug: tour.slug,
    countrySlug: countrySlug ?? tour.countrySlug,
    citySlug: citySlug ?? tour.citySlug,
  })
  if (!href) return null

  return (
    <article className="group relative h-[280px] overflow-hidden rounded">
      <Image
        src={tour.image || "/placeholder.svg"}
        alt={tour.title}
        fill
        priority={priority}
        loading={loading}
        sizes="(max-width: 768px) 100vw, 330px"
        className="object-cover transition-transform duration-500 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-black/35" aria-hidden />

      <div className="absolute inset-0 flex flex-col justify-between p-4">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-white">{tour.title}</h3>
          {tour.description && (
            <p className="line-clamp-3 text-sm leading-relaxed text-white/90">
              {tour.description}
            </p>
          )}
        </div>

        <div className="flex min-w-0 items-end justify-between gap-2">
          <Link
            href={href}
            className="inline-flex shrink-0 items-center justify-center rounded bg-brand px-4 py-3 text-sm font-medium text-brand-foreground transition-colors hover:bg-brand-dark sm:text-base"
            style={{ height: "48px" }}
          >
            Подробнее
          </Link>
          <div className={effectiveIsBus ? "inline-flex min-w-0 max-w-[64%] shrink-0 items-center justify-center rounded bg-[#E84242] px-4 py-3 text-center leading-tight shadow-sm text-white [&_*]:text-white [&_*]:!text-white" : "inline-flex min-w-0 max-w-[64%] shrink-0 items-center justify-center rounded bg-white/95 px-4 py-3 leading-tight shadow-sm"} style={{ height: "48px" }}>
            {hasStructuredPrice ? (
              <PriceSwitcher
                amount={(tour as Tour & { priceAmount?: number }).priceAmount || 0}
                currencies={currencies}
                initialCurrencyCode={currencyCode}
                showCurrencySelector={false}
                showPerPerson={!effectiveIsBus && (hidePerPersonSuffix ? false : showPerPerson)}
                compact
                extraPriceAmount={(tour as Tour & { extraPriceAmount?: number }).extraPriceAmount || 0}
                extraPriceCurrency={(tour as Tour & { extraPriceCurrency?: string }).extraPriceCurrency || ""}
                shrink
              />
            ) : (
              <Link href={href} className={effectiveIsBus ? "block break-words text-[11px] min-[400px]:text-[13px] font-bold text-white md:text-base" : "block break-words text-[11px] min-[400px]:text-[13px] font-bold text-price md:text-base"}>{cardPrice}</Link>
            )}
          </div>
        </div>
      </div>
    </article>
  )
}
