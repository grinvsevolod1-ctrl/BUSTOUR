"use client"

import { useState } from "react"
import Image from "next/image"
import { Play } from "lucide-react"
import type { Review } from "@/lib/types"
import { fallbackThumbnail, getEmbedUrl } from "@/lib/video-url"

/** Shared VIDEO review card (homepage testimonials + /testimonials page). */
export function VideoCard({
  review,
  showCaption = false,
}: {
  review: Review
  showCaption?: boolean
}) {
  const [playing, setPlaying] = useState(false)
  const embed = getEmbedUrl(review.videoUrl)
  const poster = review.thumbnailUrl || fallbackThumbnail(review.videoUrl)

  return (
    <figure className="w-full min-w-0 overflow-hidden rounded-xl border border-border bg-background">
      <div className="relative aspect-[2/1] w-full">
        {!embed ? (
          <div className="flex h-full items-center justify-center text-sm text-ink-muted">
            Видео недоступно
          </div>
        ) : playing ? (
          embed === review.videoUrl ? (
            <video
              src={embed}
              controls
              autoPlay
              poster={poster ?? undefined}
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
              <Image src={poster} alt="" fill sizes="(max-width: 640px) 100vw, 50vw" className="object-cover" />
            ) : null}
            <span className="absolute inset-0 bg-black/25 transition-colors group-hover:bg-black/35" />
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-black/55 transition-transform group-hover:scale-110">
                <Play className="ml-0.5 h-6 w-6 fill-white text-white" />
              </span>
            </span>
          </button>
        )}
      </div>
      {showCaption && (review.name || review.text) && (
        <figcaption className="px-4 py-3">
          {review.text && <p className="mb-2 text-sm leading-relaxed text-ink">{review.text}</p>}
          <span className="block font-semibold text-ink">{review.name}</span>
          {review.tour && <span className="block text-sm text-ink-muted">{review.tour}</span>}
        </figcaption>
      )}
    </figure>
  )
}
