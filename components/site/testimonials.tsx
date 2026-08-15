"use client"

import Link from "next/link"
import { useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import type { Review } from "@/lib/types"
import { VideoCard } from "@/components/site/video-card"

function InfoCard({ title, body }: { title?: string; body?: string }) {
  return (
    <div className="flex min-h-56 flex-col justify-center gap-6 py-1 sm:px-6 lg:px-0">
      <h3 className="text-xl font-semibold uppercase leading-6 text-ink">
        {title || "Видеоотзывы наших клиентов"}
      </h3>
      <span className="h-1 w-[60px] bg-cyan-accent" aria-hidden />
      {body ? <p className="text-base leading-6 text-ink">{body}</p> : null}
    </div>
  )
}

function AllReviewsCta({ label }: { label: string }) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center gap-6 text-center">
      <p className="text-xl font-semibold uppercase leading-6 text-ink">
        Все отзывы наших туристов
      </p>
      <Link
        href="/testimonials"
        className="inline-flex min-h-11 items-center justify-center rounded bg-brand px-4 py-3 text-base text-brand-foreground transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
      >
        {label}
      </Link>
    </div>
  )
}

export function Testimonials({
  reviews,
  title = "Видеоотзывы наших клиентов",
  infoTitle,
  infoBody,
  ctaLabel = "Все отзывы",
  /** Pass Infinity (or omit) to show all reviews; default 4 for the homepage widget */
  maxReviews = 4,
}: {
  reviews: Review[]
  title?: string
  infoTitle?: string
  infoBody?: string
  ctaLabel?: string
  maxReviews?: number
}) {
  const [mobilePage, setMobilePage] = useState(0)
  const DESKTOP_PAGE_SIZE = 4

  const capped = maxReviews === Infinity ? reviews : reviews.slice(0, maxReviews)
  const visible = capped.slice(0, DESKTOP_PAGE_SIZE)
  const mobileReview = capped[mobilePage]

  return (
    <section
      className="mx-auto w-full max-w-[1440px] px-4 py-6 md:px-6"
      aria-label={title}
    >
      <div className="space-y-6 sm:hidden">
        <InfoCard title={infoTitle || title} body={infoBody} />

        {mobileReview ? (
          <div aria-roledescription="carousel" aria-label="Видеоотзывы клиентов">
            <VideoCard key={mobileReview.id} review={mobileReview} />
            {capped.length > 1 ? (
              <div className="mt-4 flex items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={() => setMobilePage((page) => Math.max(0, page - 1))}
                  disabled={mobilePage === 0}
                  aria-label="Предыдущий отзыв"
                  className="grid h-11 w-11 place-items-center rounded-full border border-line text-ink transition-colors hover:bg-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft className="h-5 w-5" aria-hidden />
                </button>
                <span className="min-w-14 text-center text-sm text-ink-muted" aria-live="polite">
                  {mobilePage + 1} / {capped.length}
                </span>
                <button
                  type="button"
                  onClick={() => setMobilePage((page) => Math.min(capped.length - 1, page + 1))}
                  disabled={mobilePage === capped.length - 1}
                  aria-label="Следующий отзыв"
                  className="grid h-11 w-11 place-items-center rounded-full border border-line text-ink transition-colors hover:bg-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronRight className="h-5 w-5" aria-hidden />
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        <AllReviewsCta label={ctaLabel} />
      </div>

      <div className="hidden gap-6 sm:grid sm:grid-cols-2 lg:grid-cols-3">
        <InfoCard title={infoTitle || title} body={infoBody} />
        {visible.map((review) => (
          <VideoCard key={review.id} review={review} />
        ))}
        <AllReviewsCta label={ctaLabel} />
      </div>
    </section>
  )
}
