"use client"

import { useState } from "react"
import Image from "next/image"
import { Play } from "lucide-react"

/** Same UX as homepage video testimonials: poster + play, then native controls. */
export function ClickToPlayVideo({
  src,
  poster,
  label,
  className,
}: {
  src: string
  poster?: string
  label: string
  className?: string
}) {
  const [playing, setPlaying] = useState(false)

  return (
    <div className={className ?? "relative aspect-2/1 w-full overflow-hidden rounded"}>
      {playing ? (
        <video
          src={src}
          controls
          autoPlay
          poster={poster || undefined}
          className="h-full w-full object-cover"
        >
          Ваш браузер не поддерживает воспроизведение видео.
        </video>
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          aria-label={`Воспроизвести — ${label}`}
          className="group absolute inset-0 h-full w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-inset"
        >
          {poster ? (
            <Image src={poster} alt="" fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" />
          ) : (
            <span className="absolute inset-0 bg-ink/10" />
          )}
          <span className="absolute inset-0 bg-black/25 transition-colors group-hover:bg-black/35" />
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-black/55 transition-transform group-hover:scale-110">
              <Play className="ml-0.5 h-6 w-6 fill-white text-white" />
            </span>
          </span>
        </button>
      )}
    </div>
  )
}
