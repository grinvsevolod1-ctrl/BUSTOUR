"use client"

import { useRef, useState } from "react"
import { ChevronDown } from "lucide-react"
import type { Review } from "@/lib/types"
import { TitleUnderline } from "@/components/site/title-underline"
import { ReviewCardPublic, ReviewFullTextModal } from "@/components/site/review-card-public"
import { useReviewRowClamp } from "@/components/site/use-review-row-clamp"

const PER_PAGE = 6

export function ReviewsSection({ reviews }: { reviews: Review[] }) {
  const [visible, setVisible] = useState(PER_PAGE)
  const [modalReview, setModalReview] = useState<Review | null>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const slice = reviews.slice(0, visible)
  const hasMore = visible < reviews.length

  useReviewRowClamp(gridRef, [slice.length, slice.map((r) => r.id).join(",")])

  return (
    <section className="mx-auto w-full max-w-[1440px] px-4 md:px-6">
      <TitleUnderline as="h2">Отзывы наших клиентов</TitleUnderline>

      <div
        ref={gridRef}
        className="mt-4 grid grid-cols-1 items-stretch gap-6 md:grid-cols-2 lg:grid-cols-3"
      >
        {slice.map((review) => (
          <ReviewCardPublic key={review.id} review={review} onReadMore={setModalReview} />
        ))}
      </div>

      {hasMore ? (
        <div className="mt-6">
          <button
            type="button"
            onClick={() => setVisible((v) => v + PER_PAGE)}
            className="inline-flex min-h-11 items-center gap-3 rounded border border-brand bg-transparent px-6 py-3 text-base font-semibold text-ink transition-colors hover:bg-brand/10"
          >
            Загрузить еще отзывы
            <ChevronDown size={16} aria-hidden="true" />
          </button>
        </div>
      ) : null}

      <ReviewFullTextModal
        review={modalReview}
        open={Boolean(modalReview)}
        onClose={() => setModalReview(null)}
      />
    </section>
  )
}
