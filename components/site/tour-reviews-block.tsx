"use client"

import { useRef, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import type { Review } from "@/lib/types"
import { ReviewCardPublic, ReviewFullTextModal } from "@/components/site/review-card-public"
import { TitleUnderline } from "@/components/site/title-underline"
import { useReviewRowClamp } from "@/components/site/use-review-row-clamp"
import { cn } from "@/lib/utils"

export function TourReviewsBlock({
  reviews,
  title = "Отзывы о туре",
}: {
  reviews: Review[]
  title?: string
}) {
  const [modalReview, setModalReview] = useState<Review | null>(null)
  const [page, setPage] = useState(0)
  const gridRef = useRef<HTMLDivElement>(null)
  const mobileReview = reviews[page]

  useReviewRowClamp(gridRef, [reviews.length, reviews.map((r) => r.id).join(",")])

  if (!reviews.length) return null

  return (
    <div className="space-y-4">
      {title.trim() ? <TitleUnderline as="h2">{title}</TitleUnderline> : null}

      {/* Mobile: CSS snap / page carousel */}
      <div className="md:hidden" aria-roledescription="carousel" aria-label={title}>
        {mobileReview ? (
          <ReviewCardPublic review={mobileReview} onReadMore={setModalReview} />
        ) : null}
        {reviews.length > 1 ? (
          <div className="mt-4 flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              aria-label="Предыдущий отзыв"
              className="grid h-11 w-11 place-items-center rounded-full border border-line text-ink transition-colors hover:bg-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden />
            </button>
            <span className="min-w-14 text-center text-sm text-ink-muted" aria-live="polite">
              {page + 1} / {reviews.length}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(reviews.length - 1, p + 1))}
              disabled={page === reviews.length - 1}
              aria-label="Следующий отзыв"
              className="grid h-11 w-11 place-items-center rounded-full border border-line text-ink transition-colors hover:bg-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight className="h-5 w-5" aria-hidden />
            </button>
          </div>
        ) : null}
      </div>

      {/* Desktop: equal-height grid */}
      <div
        ref={gridRef}
        className={cn(
          "hidden items-stretch gap-6 md:grid",
          reviews.length > 1 ? "md:grid-cols-2" : "md:grid-cols-1",
        )}
      >
        {reviews.map((r) => (
          <ReviewCardPublic key={r.id} review={r} onReadMore={setModalReview} />
        ))}
      </div>

      <ReviewFullTextModal
        review={modalReview}
        open={Boolean(modalReview)}
        onClose={() => setModalReview(null)}
      />
    </div>
  )
}
