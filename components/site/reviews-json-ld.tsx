/** TravelAgency Review / AggregateRating JSON-LD for /testimonials (and similar). */

import type { Review } from "@/lib/types"
import {
  buildReviewsPageJsonLd,
  reviewDatePublished,
  serializeJsonLd,
  type ItemReviewedRef,
  type ReviewSchemaItem,
} from "@/lib/reviews-schema"
import { organizationId } from "@/lib/site-schema"

export type { ReviewSchemaItem }

export function reviewsToSchemaItems(reviews: Review[]): ReviewSchemaItem[] {
  return reviews.map((r) => ({
    name: r.name,
    text: r.text,
    rating: r.rating,
    tour: r.tour,
    datePublished: reviewDatePublished(r),
  }))
}

export function ReviewsJsonLd({
  reviews,
  brandName,
  url,
  itemReviewed,
}: {
  reviews: Review[]
  brandName: string
  url?: string
  /** Override default TravelAgency itemReviewed for company-scoped reviews. */
  itemReviewed?: ItemReviewedRef
}) {
  let orgId: string | undefined
  if (url) {
    try {
      orgId = organizationId(new URL(url).origin)
    } catch {
      orgId = undefined
    }
  }
  const data = buildReviewsPageJsonLd(reviewsToSchemaItems(reviews), {
    brandName,
    url,
    ...(orgId ? { organizationId: orgId } : {}),
    ...(itemReviewed ? { itemReviewed } : {}),
  })
  if (!data) return null

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  )
}
