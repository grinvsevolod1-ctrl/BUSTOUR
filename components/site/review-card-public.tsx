"use client"

import { useLayoutEffect, useRef, useState } from "react"
import Image from "next/image"
import { Play } from "lucide-react"
import type { Review } from "@/lib/types"
import {
  formatReviewDisplayDate,
  isVideoReview,
  parseReviewPhotoUrls,
  primaryReviewPhotoUrl,
  reviewHasMedia,
} from "@/lib/review-admin"
import { reviewDatePublished } from "@/lib/reviews-schema"
import { reviewAvatarTone, reviewPlainText } from "@/lib/review-utils"
import { syncReviewRowClamps } from "@/lib/review-row-clamp"
import { fallbackThumbnail, getEmbedUrl } from "@/lib/video-url"
import { ImageLightbox } from "@/components/site/image-lightbox"
import { SiteModalShell } from "@/components/site/modals/site-modal-shell"
import { cn } from "@/lib/utils"

const MD_UP = "(min-width: 768px)"

export function ReviewStarRating({ rating }: { rating: number }) {
  return (
    <div
      className="flex gap-0.5"
      itemProp="reviewRating"
      itemScope
      itemType="https://schema.org/Rating"
      aria-label={`${rating} из 5 звёзд`}
    >
      <meta itemProp="ratingValue" content={String(rating)} />
      <meta itemProp="bestRating" content="5" />
      {Array.from({ length: 5 }, (_, i) => (
        <svg key={i} width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path
            d="M8 1.5l1.647 3.337L13.5 5.44l-2.75 2.68.649 3.78L8 10.1l-3.399 1.8.649-3.78L2.5 5.44l3.853-.603L8 1.5z"
            fill={i < rating ? "#F0B336" : "none"}
            stroke="#F0B336"
            strokeWidth="1.2"
          />
        </svg>
      ))}
    </div>
  )
}

function ReviewAvatar({ name }: { name: string }) {
  const initial = (name.trim().charAt(0) || "?").toUpperCase()
  return (
    <div
      className={cn(
        "flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-xl font-bold",
        reviewAvatarTone(name),
      )}
      aria-hidden="true"
    >
      {initial}
    </div>
  )
}

function ReviewHeader({ review }: { review: Review }) {
  const date = formatReviewDisplayDate(review)
  const iso = reviewDatePublished(review)
  return (
    <div className="flex min-w-0 items-start gap-4">
      <ReviewAvatar name={review.name} />
      <div className="flex min-w-0 flex-col gap-0.5" itemProp="author" itemScope itemType="https://schema.org/Person">
        <p className="break-words text-lg font-semibold leading-snug text-ink" itemProp="name">
          {review.name}
        </p>
        <ReviewStarRating rating={review.rating} />
        {iso ? <meta itemProp="datePublished" content={iso} /> : null}
        {date ? <p className="text-sm font-medium text-ink-muted">{date}</p> : null}
      </div>
    </div>
  )
}

function ReviewVideoPlayer({ review }: { review: Review }) {
  const [playing, setPlaying] = useState(false)
  const embed = getEmbedUrl(review.videoUrl)
  const poster =
    primaryReviewPhotoUrl(review.thumbnailUrl) || fallbackThumbnail(review.videoUrl) || undefined

  return (
    <div className="relative h-48 w-full overflow-hidden rounded-lg bg-ink/5">
      {!embed ? (
        <div className="flex h-full items-center justify-center text-sm text-ink-muted">Видео недоступно</div>
      ) : playing ? (
        embed === review.videoUrl ? (
          <video
            src={embed}
            controls
            autoPlay
            poster={poster}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <iframe
            src={embed}
            title={`Видеоотзыв — ${review.name}`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 h-full w-full"
          />
        )
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          aria-label={`Воспроизвести видеоотзыв — ${review.name}`}
          className="group absolute inset-0 h-full w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-inset"
        >
          {poster ? (
            <Image src={poster} alt="" fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />
          ) : null}
          <span className="absolute inset-0 bg-black/25 transition-colors group-hover:bg-black/35" />
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-black/55 transition-transform group-hover:scale-110">
              <Play className="ml-0.5 h-6 w-6 fill-white text-white" aria-hidden />
            </span>
          </span>
        </button>
      )}
    </div>
  )
}

function ReviewMediaBlock({ review }: { review: Review }) {
  if (isVideoReview(review)) return <ReviewVideoPlayer review={review} />
  const photos = parseReviewPhotoUrls(review.thumbnailUrl)
  if (!photos.length) return null
  return (
    <div className="flex flex-wrap gap-2">
      {photos.map((src, i) => (
        <div
          key={src}
          className="group relative aspect-[4/3] h-[60px] w-[80px] shrink-0 overflow-hidden rounded border border-border focus-within:ring-2 focus-within:ring-brand/40"
        >
          <ImageLightbox
            src={src}
            alt={`Фото ${i + 1} к отзыву ${review.name}`}
            sizes="80px"
            className="object-cover transition-transform duration-200 ease-out motion-reduce:transition-none group-hover:scale-110"
          />
        </div>
      ))}
    </div>
  )
}

export function ReviewFullTextModal({
  review,
  open,
  onClose,
}: {
  review: Review | null
  open: boolean
  onClose: () => void
}) {
  if (!review) return null
  const body = reviewPlainText(review.text)
  const hasMedia = reviewHasMedia(review)
  return (
    <SiteModalShell
      open={open}
      onClose={onClose}
      title={review.name}
      titleId={`review-full-${review.id}`}
      maxWidthClass="max-w-xl md:max-w-2xl"
    >
      <div className="flex flex-col gap-4">
        <ReviewStarRating rating={review.rating} />
        <p className="text-sm font-medium text-ink-muted">{formatReviewDisplayDate(review)}</p>
        <p className="whitespace-pre-wrap break-words text-base leading-relaxed text-ink">{body}</p>
        {hasMedia ? <ReviewMediaBlock review={review} /> : null}
      </div>
    </SiteModalShell>
  )
}

export function ReviewCardPublic({
  review,
  onReadMore,
  className = "",
}: {
  review: Review
  onReadMore: (review: Review) => void
  className?: string
}) {
  const body = reviewPlainText(review.text)
  const hasMedia = reviewHasMedia(review)
  const articleRef = useRef<HTMLElement>(null)
  const textRef = useRef<HTMLParagraphElement>(null)
  const [needsExpand, setNeedsExpand] = useState(false)
  const [expanded, setExpanded] = useState(false)

  // Row sync sets -webkit-line-clamp (4 if row all text-only; more next to media).
  const clamped = !expanded

  useLayoutEffect(() => {
    const grid = articleRef.current?.parentElement
    if (grid) syncReviewRowClamps(grid)
  }, [expanded, body, hasMedia])

  useLayoutEffect(() => {
    if (!clamped) {
      setNeedsExpand(false)
      return
    }
    const el = textRef.current
    if (!el) return
    const measure = () => setNeedsExpand(el.scrollHeight > el.clientHeight + 1)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [body, clamped, hasMedia])

  function handleReadMore() {
    // Desktop/tablet → modal; phone → inline expand (matchMedia at click, no hydration flicker).
    if (typeof window !== "undefined" && window.matchMedia(MD_UP).matches) {
      onReadMore(review)
      return
    }
    setExpanded(true)
  }

  return (
    <article
      ref={articleRef}
      itemScope
      itemType="https://schema.org/Review"
      data-review-card=""
      data-has-media={hasMedia ? "1" : "0"}
      data-expanded={expanded ? "1" : "0"}
      className={cn("flex h-full min-w-0 flex-col gap-4 rounded-xl border border-border bg-background p-6", className)}
    >
      <ReviewHeader review={review} />

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="relative min-h-0 flex-1 overflow-hidden" data-review-text-slot="">
          <p
            ref={textRef}
            itemProp="reviewBody"
            data-review-body=""
            className={cn(
              "break-words text-base leading-relaxed text-ink whitespace-pre-wrap",
              // SSR / pre-sync default; syncReviewRowClamps overrides via inline style.
              clamped && "line-clamp-4",
            )}
          >
            {body}
          </p>
          {clamped && needsExpand ? (
            <span
              className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-background to-transparent"
              aria-hidden="true"
            />
          ) : null}
        </div>
      </div>

      {(hasMedia || (clamped && needsExpand) || expanded) && (
        <div className="mt-auto flex flex-col gap-3">
          {clamped && needsExpand ? (
            <button
              type="button"
              onClick={handleReadMore}
              className="inline-flex min-h-11 items-center gap-1.5 self-start text-sm font-semibold text-brand underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
            >
              Читать полностью
            </button>
          ) : null}
          {expanded ? (
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="inline-flex min-h-11 items-center gap-1.5 self-start text-sm font-semibold text-brand underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
            >
              Свернуть
            </button>
          ) : null}
          {hasMedia ? <ReviewMediaBlock review={review} /> : null}
        </div>
      )}
    </article>
  )
}
