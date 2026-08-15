/** Pure TravelAgency/Product + Review / AggregateRating JSON-LD (Google rich results). */

import { serializeJsonLd } from "@/lib/faq-schema"
import { reviewPlainText } from "@/lib/review-utils"

export { serializeJsonLd }

export type ReviewItemReviewedType = "TravelAgency" | "Organization" | "LocalBusiness" | "Product" | "Trip"

export type ReviewSchemaItem = {
  name: string
  text: string
  rating: number
  /** ISO date YYYY-MM-DD when known */
  datePublished?: string
  /** Tour title → itemReviewed Product/Trip when set */
  tour?: string
}

export type ItemReviewedRef = {
  "@type": ReviewItemReviewedType
  name: string
  url?: string
}

export type ReviewJsonLdNode = {
  "@type": "Review"
  author: { "@type": "Person"; name: string }
  reviewBody: string
  reviewRating: {
    "@type": "Rating"
    ratingValue: number
    bestRating: number
    worstRating: number
  }
  datePublished?: string
  itemReviewed: ItemReviewedRef
}

export type AggregateRatingJsonLd = {
  "@type": "AggregateRating"
  ratingValue: number
  reviewCount: number
  bestRating: number
  worstRating: number
}

export type ReviewsPageJsonLd = {
  "@context": "https://schema.org"
  "@type": "TravelAgency"
  "@id"?: string
  name: string
  url?: string
  aggregateRating: AggregateRatingJsonLd
  review: ReviewJsonLdNode[]
}

export type BuildReviewsJsonLdOptions = {
  brandName: string
  url?: string
  organizationId?: string
  /** Default itemReviewed for company reviews (no tour). */
  itemReviewed?: ItemReviewedRef
}

/** Prefer sourceDate (ISO prefix), else createdAt epoch ms → YYYY-MM-DD. */
export function reviewDatePublished(input: {
  sourceDate?: string | null
  createdAt?: number | null
}): string | undefined {
  const raw = input.sourceDate?.trim()
  if (raw && /^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10)
  if (input.createdAt && Number.isFinite(input.createdAt)) {
    return new Date(input.createdAt).toISOString().slice(0, 10)
  }
  return undefined
}

function clampRating(rating: number): number | null {
  if (!Number.isFinite(rating)) return null
  const n = Math.round(rating)
  if (n < 1 || n > 5) return null
  return n
}

function defaultOrgReviewed(brandName: string, url?: string): ItemReviewedRef {
  return {
    "@type": "TravelAgency",
    name: brandName,
    ...(url ? { url } : {}),
  }
}

export function normalizeReviewSchemaItems(items: ReviewSchemaItem[]): ReviewSchemaItem[] {
  return items
    .map((item) => {
      const rating = clampRating(item.rating)
      if (rating == null) return null
      const name = reviewPlainText(item.name)
      const text = reviewPlainText(item.text)
      if (!name || !text) return null
      const tour = item.tour ? reviewPlainText(item.tour) : ""
      return {
        name,
        text,
        rating,
        ...(item.datePublished ? { datePublished: item.datePublished } : {}),
        ...(tour ? { tour } : {}),
      }
    })
    .filter((item): item is ReviewSchemaItem => item != null)
}

export function buildAggregateRating(reviews: ReviewSchemaItem[]): AggregateRatingJsonLd {
  const sum = reviews.reduce((acc, r) => acc + r.rating, 0)
  const avg = Math.round((sum / reviews.length) * 10) / 10
  return {
    "@type": "AggregateRating",
    ratingValue: avg,
    reviewCount: reviews.length,
    bestRating: 5,
    worstRating: 1,
  }
}

function buildReviewNodes(
  reviews: ReviewSchemaItem[],
  fallbackReviewed: ItemReviewedRef,
  tourAs: "Product" | "Trip" = "Product",
): ReviewJsonLdNode[] {
  return reviews.map((r) => {
    const itemReviewed: ItemReviewedRef = r.tour
      ? { "@type": tourAs, name: r.tour }
      : fallbackReviewed
    return {
      "@type": "Review" as const,
      author: { "@type": "Person" as const, name: r.name },
      reviewBody: r.text,
      reviewRating: {
        "@type": "Rating" as const,
        ratingValue: r.rating,
        bestRating: 5,
        worstRating: 1,
      },
      ...(r.datePublished ? { datePublished: r.datePublished } : {}),
      itemReviewed,
    }
  })
}

/** TravelAgency JSON-LD with AggregateRating + Review[]. Null when no valid reviews. */
export function buildReviewsPageJsonLd(
  items: ReviewSchemaItem[],
  options: BuildReviewsJsonLdOptions,
): ReviewsPageJsonLd | null {
  const reviews = normalizeReviewSchemaItems(items)
  if (!reviews.length) return null

  const brandName = reviewPlainText(options.brandName) || "БасТур"
  const fallback =
    options.itemReviewed ?? defaultOrgReviewed(brandName, options.url)

  return {
    "@context": "https://schema.org",
    "@type": "TravelAgency",
    ...(options.organizationId ? { "@id": options.organizationId } : {}),
    name: brandName,
    ...(options.url ? { url: options.url } : {}),
    aggregateRating: buildAggregateRating(reviews),
    review: buildReviewNodes(reviews, fallback, "Product"),
  }
}

/** Attach AggregateRating + Review[] onto an existing Product JSON-LD (tour page). */
export function withProductReviews<T extends { "@type": "Product"; name: string }>(
  product: T,
  items: ReviewSchemaItem[],
): (T & { aggregateRating: AggregateRatingJsonLd; review: ReviewJsonLdNode[] }) | T {
  const reviews = normalizeReviewSchemaItems(items)
  if (!reviews.length) return product
  const fallback: ItemReviewedRef = { "@type": "Product", name: product.name }
  return {
    ...product,
    aggregateRating: buildAggregateRating(reviews),
    review: buildReviewNodes(reviews, fallback, "Product"),
  }
}
