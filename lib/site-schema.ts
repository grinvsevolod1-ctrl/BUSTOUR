/** Shared schema.org builders for public site JSON-LD. */

import { getCanonicalOrigin } from "@/lib/canonical-origin"
import { parseSocialLinks } from "@/lib/social-links"
import { serializeJsonLd, stripFaqHtml } from "@/lib/faq-schema"
import type { SiteSettings } from "@/lib/types"

export { serializeJsonLd }

export function organizationId(origin: string): string {
  return `${origin.replace(/\/$/, "")}/#organization`
}

export function absoluteUrl(origin: string, pathOrUrl: string | undefined | null): string | undefined {
  const raw = String(pathOrUrl || "").trim()
  if (!raw) return undefined
  if (/^https?:\/\//i.test(raw)) return raw
  const base = origin.replace(/\/$/, "")
  return `${base}${raw.startsWith("/") ? raw : `/${raw}`}`
}

/** Parse `site.hours` like `10:00–18:00` → opens/closes (fallback weekdays 10–18). */
export function parseSiteOpenClose(settings: SiteSettings): { opens: string; closes: string } {
  const raw = String(settings["site.hours"] || "10:00–18:00")
  const m = raw.match(/(\d{1,2}:\d{2})\s*[–\-—]\s*(\d{1,2}:\d{2})/)
  return {
    opens: m?.[1] ?? "10:00",
    closes: m?.[2] ?? "18:00",
  }
}

export type OpeningHoursSpecification = {
  "@type": "OpeningHoursSpecification"
  dayOfWeek: string[]
  opens: string
  closes: string
}

export function buildWeekdayOpeningHours(settings: SiteSettings): OpeningHoursSpecification[] {
  const { opens, closes } = parseSiteOpenClose(settings)
  return [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens,
      closes,
    },
  ]
}

export type TravelAgencyJsonLd = {
  "@context": "https://schema.org"
  "@type": "TravelAgency"
  "@id": string
  name: string
  url: string
  description?: string
  telephone?: string
  email?: string
  logo?: string
  sameAs?: string[]
  address?: {
    "@type": "PostalAddress"
    streetAddress?: string
    addressLocality?: string
    addressCountry?: string
  }
  openingHoursSpecification: OpeningHoursSpecification[]
}

export function buildTravelAgencyJsonLd(
  settings: SiteSettings,
  opts?: { phone?: string; email?: string },
): TravelAgencyJsonLd {
  // 🔐 Trust boundary: canonical origin ALWAYS comes from env, NEVER from CMS site.url
  const origin = getCanonicalOrigin()
  const sameAs = parseSocialLinks(settings)
    .map((s) => s.url.trim())
    .filter((u) => /^https?:\/\//i.test(u))

  const name = stripFaqHtml(settings["site.brand"] || "БасТур") || "БасТур"
  const phone = opts?.phone?.trim() || undefined
  const email = opts?.email?.trim() || undefined
  const street = settings["site.address"]?.trim() || undefined

  return {
    "@context": "https://schema.org",
    "@type": "TravelAgency",
    "@id": organizationId(origin),
    name,
    url: origin,
    description:
      "Туристическая компания: автобусные туры, авиатуры, горящие туры и аренда автобусов.",
    ...(phone ? { telephone: phone } : {}),
    ...(email ? { email } : {}),
    logo: absoluteUrl(origin, "/figma/logomark.svg"),
    ...(sameAs.length ? { sameAs } : {}),
    ...(street
      ? {
          address: {
            "@type": "PostalAddress",
            streetAddress: street,
            addressLocality: "Минск",
            addressCountry: "BY",
          },
        }
      : {}),
    openingHoursSpecification: buildWeekdayOpeningHours(settings),
  }
}

export type WebSiteJsonLd = {
  "@context": "https://schema.org"
  "@type": "WebSite"
  name: string
  url: string
  publisher: { "@id": string }
}

/**
 * WebSite only — no SearchAction.
 * Avia/hot search is Tourvisor embed (not a first-party `?q=` URL Google can crawl).
 */
export function buildWebSiteJsonLd(settings: SiteSettings): WebSiteJsonLd {
  const origin = getCanonicalOrigin()
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: stripFaqHtml(settings["site.brand"] || "БасТур") || "БасТур",
    url: origin,
    publisher: { "@id": organizationId(origin) },
  }
}

export type ArticleJsonLd = {
  "@context": "https://schema.org"
  "@type": "Article"
  headline: string
  description?: string
  image?: string
  datePublished?: string
  dateModified?: string
  author: { "@type": "Organization"; "@id": string; name: string }
  publisher: { "@type": "Organization"; "@id": string; name: string; logo?: string }
  mainEntityOfPage: string
  url: string
}

export function buildArticleJsonLd(input: {
  origin: string
  brandName: string
  title: string
  description?: string
  image?: string
  date?: string
  urlPath: string
}): ArticleJsonLd | null {
  const headline = stripFaqHtml(input.title)
  if (!headline) return null
  const origin = input.origin.replace(/\/$/, "")
  const url = absoluteUrl(origin, input.urlPath)
  if (!url) return null
  const orgId = organizationId(origin)
  const brand = stripFaqHtml(input.brandName) || "БасТур"
  const date = input.date?.trim().slice(0, 10)
  const image = absoluteUrl(origin, input.image)
  const description = input.description ? stripFaqHtml(input.description) : undefined

  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline,
    ...(description ? { description } : {}),
    ...(image ? { image } : {}),
    ...(date ? { datePublished: date, dateModified: date } : {}),
    author: { "@type": "Organization", "@id": orgId, name: brand },
    publisher: {
      "@type": "Organization",
      "@id": orgId,
      name: brand,
      logo: absoluteUrl(origin, "/figma/logomark.svg"),
    },
    mainEntityOfPage: url,
    url,
  }
}

export type ProductOfferJsonLd = {
  "@context": "https://schema.org"
  "@type": "Product"
  name: string
  description?: string
  image?: string
  url?: string
  category?: string
  brand?: { "@type": "Brand"; name: string }
  offers: {
    "@type": "Offer"
    price: string
    priceCurrency: string
    availability: string
    url?: string
  }
}

export function buildProductOfferJsonLd(input: {
  name: string
  description?: string
  image?: string
  url?: string
  category?: string
  brandName?: string
  price: string | number
  priceCurrency?: string
  /** If seats/available dates known, flag availability. Default conservative = OutOfStock. */
  availableSeats?: number | null
  hasAvailability?: boolean
}): ProductOfferJsonLd | null {
  const name = stripFaqHtml(input.name)
  if (!name) return null
  const priceRaw = String(input.price ?? "").replace(/[^\d.]/g, "") || "0"
  const priceNum = Number(priceRaw)
  // Must be valid positive price. If 0 or NaN or negative — refuse to emit Offer (google penalises 0-price).
  if (!Number.isFinite(priceNum) || priceNum <= 0) return null
  const description = input.description ? stripFaqHtml(input.description) : undefined
  const brand = input.brandName ? stripFaqHtml(input.brandName) : undefined
  const SCHEMA_IN_STOCK = "https://schema.org/InStock"
  const SCHEMA_OUT_OF_STOCK = "https://schema.org/OutOfStock"
  const availability =
    input.hasAvailability === true ||
    (typeof input.availableSeats === "number" && input.availableSeats > 0)
      ? SCHEMA_IN_STOCK
      : SCHEMA_OUT_OF_STOCK

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    ...(description ? { description } : {}),
    ...(input.image ? { image: input.image } : {}),
    ...(input.url ? { url: input.url } : {}),
    ...(input.category ? { category: input.category } : {}),
    ...(brand ? { brand: { "@type": "Brand", name: brand } } : {}),
    offers: {
      "@type": "Offer",
      price: String(priceNum),
      priceCurrency: input.priceCurrency || "BYN",
      availability,
      ...(input.url ? { url: input.url } : {}),
    },
  }
}
