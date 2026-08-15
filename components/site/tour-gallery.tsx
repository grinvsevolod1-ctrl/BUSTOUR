"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import Image from "next/image"
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Play, X, Expand } from "lucide-react"
import { extToType } from "@/lib/media/utils"
import { ZoomableLightboxImage } from "@/components/site/image-lightbox"

type Direction = "left" | "right" | "none"
type GallerySlide = { url: string; alt: string }

function isVideoUrl(url: string) {
  return extToType(url.split(/[?#]/, 1)[0] ?? url) === "video"
}

function mediaLabel(slide: GallerySlide | undefined) {
  return slide && isVideoUrl(slide.url) ? "видео" : "фото"
}

function SlideMedia({
  slide,
  priority,
  sizes,
  objectFit = "contain",
  controls = false,
  muted = false,
  className,
}: {
  slide: GallerySlide
  priority?: boolean
  sizes: string
  objectFit?: "contain" | "cover"
  controls?: boolean
  muted?: boolean
  className?: string
}) {
  const fit = objectFit === "cover" ? "object-cover" : "object-contain"
  if (isVideoUrl(slide.url)) {
    return (
      <video
        src={slide.url}
        className={`absolute inset-0 h-full w-full ${fit} ${className ?? ""}`}
        controls={controls}
        muted={muted}
        playsInline
        preload="metadata"
        aria-label={slide.alt || undefined}
      />
    )
  }
  return (
    <Image
      src={slide.url || "/placeholder.svg"}
      alt={slide.alt}
      fill
      sizes={sizes}
      className={`${fit} ${className ?? ""}`}
      priority={priority}
      draggable={false}
    />
  )
}

function useSlider(total: number) {
  const [active, setActive] = useState(0)
  const [outgoing, setOutgoing] = useState<number | null>(null)
  const [direction, setDirection] = useState<Direction>("none")

  const go = useCallback(
    (next: number, dir?: Direction) => {
      if (outgoing !== null || total <= 1) return
      const idx = ((next % total) + total) % total
      if (idx === active) return
      const inferred: Direction =
        (active + 1) % total === idx
          ? "left"
          : (active - 1 + total) % total === idx
            ? "right"
            : idx > active
              ? "left"
              : "right"
      setDirection(dir ?? inferred)
      setOutgoing(active)
      setActive(idx)
    },
    [active, outgoing, total],
  )

  const endAnim = useCallback(() => {
    setOutgoing(null)
    setDirection("none")
  }, [])

  return { active, outgoing, direction, go, endAnim }
}

function Lightbox({
  slides,
  index,
  onClose,
  onNav,
}: {
  slides: GallerySlide[]
  index: number
  onClose: () => void
  onNav: (i: number) => void
}) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const [zoomed, setZoomed] = useState(false)

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
      if (e.key === "ArrowLeft") onNav((index - 1 + slides.length) % slides.length)
      if (e.key === "ArrowRight") onNav((index + 1) % slides.length)
    }
    window.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener("keydown", onKey)
    }
  }, [index, slides.length, onClose, onNav])

  const slide = slides[index]
  const caption =
    slide?.alt && slides.length > 1 ? `${slide.alt} — ${mediaLabel(slide)} ${index + 1}` : slide?.alt || ""

  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center overscroll-none bg-black/90 backdrop-blur-sm ${
        zoomed ? "p-0" : "overflow-hidden p-3 sm:p-4"
      }`}
      style={{
        paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
        paddingTop: "max(0.75rem, env(safe-area-inset-top))",
        paddingLeft: "max(0.75rem, env(safe-area-inset-left))",
        paddingRight: "max(0.75rem, env(safe-area-inset-right))",
      }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={caption || `Просмотр ${mediaLabel(slide)}`}
    >
      <button
        ref={closeRef}
        type="button"
        onClick={onClose}
        aria-label="Закрыть"
        className="fixed right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-50 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white touch-manipulation transition-colors hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 sm:right-4"
      >
        <X className="h-5 w-5" aria-hidden />
      </button>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onNav((index - 1 + slides.length) % slides.length)
        }}
        aria-label="Предыдущее"
        className="fixed left-1 top-1/2 z-50 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white touch-manipulation transition-colors hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 sm:left-4 sm:h-12 sm:w-12"
      >
        <ChevronLeft className="h-6 w-6 sm:h-7 sm:w-7" aria-hidden />
      </button>

      <div
        className={
          zoomed
            ? "relative h-full w-full max-w-none max-h-none p-0"
            : "relative mx-12 h-[min(85dvh,calc(100dvh-1.5rem))] w-full max-w-full sm:mx-16 md:max-w-[80vw]"
        }
        onClick={(e) => e.stopPropagation()}
      >
        {slide && isVideoUrl(slide.url) ? (
          <SlideMedia
            slide={{ ...slide, alt: caption }}
            sizes="100vw"
            controls
            priority
          />
        ) : slide ? (
          <ZoomableLightboxImage src={slide.url} alt={caption} onZoomChange={setZoomed} />
        ) : null}
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onNav((index + 1) % slides.length)
        }}
        aria-label="Следующее"
        className="fixed right-1 top-1/2 z-50 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white touch-manipulation transition-colors hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 sm:right-4 sm:h-12 sm:w-12"
      >
        <ChevronRight className="h-6 w-6 sm:h-7 sm:w-7" aria-hidden />
      </button>

      <div className="absolute bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 text-sm text-white/60">
        {index + 1} / {slides.length}
      </div>
    </div>,
    document.body,
  )
}

export function TourGallery({
  images,
  alt = "",
  slides: slidesProp,
}: {
  images?: string[]
  alt?: string
  slides?: GallerySlide[]
}) {
  const slides =
    slidesProp?.length
      ? slidesProp
      : (images?.length ? images : ["/placeholder.svg"]).map((url) => ({ url, alt }))
  const list = slides.map((s) => s.url)
  const total = slides.length
  const { active, outgoing, direction, go, endAnim } = useSlider(total)
  const [lightbox, setLightbox] = useState<number | null>(null)
  const thumbnailsRef = useRef<HTMLDivElement>(null)
  const [canScrollUp, setCanScrollUp] = useState(false)
  const [canScrollDown, setCanScrollDown] = useState(false)
  const fallbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const activeAlt =
    slides[active]?.alt && total > 1
      ? `${slides[active].alt} — ${mediaLabel(slides[active])} ${active + 1}`
      : slides[active]?.alt || ""

  const updateThumbnailScroll = useCallback(() => {
    const element = thumbnailsRef.current
    if (!element) return
    setCanScrollUp(element.scrollTop > 0 || element.scrollLeft > 0)
    setCanScrollDown(
      element.scrollTop + element.clientHeight < element.scrollHeight - 1 ||
      element.scrollLeft + element.clientWidth < element.scrollWidth - 1,
    )
  }, [])

  useEffect(() => {
    updateThumbnailScroll()
    const element = thumbnailsRef.current
    if (!element) return
    element.addEventListener("scroll", updateThumbnailScroll)
    return () => element.removeEventListener("scroll", updateThumbnailScroll)
  }, [total, updateThumbnailScroll])

  useEffect(() => {
    if (outgoing === null) return
    if (fallbackTimer.current) clearTimeout(fallbackTimer.current)
    // Safari sometimes skips animationend — clear outgoing anyway
    fallbackTimer.current = setTimeout(endAnim, 400)
    return () => {
      if (fallbackTimer.current) clearTimeout(fallbackTimer.current)
    }
  }, [outgoing, endAnim])

  function scrollThumbnails(dir: "up" | "down") {
    thumbnailsRef.current?.scrollBy({
      top: dir === "up" ? -112 : 112,
      left: dir === "up" ? -104 : 104,
      behavior: "smooth",
    })
  }

  const dragStart = useRef<number | null>(null)
  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("video, button")) return
    dragStart.current = e.clientX
  }
  const onPointerUp = (e: React.PointerEvent) => {
    if (dragStart.current === null) return
    const dx = e.clientX - dragStart.current
    if (Math.abs(dx) > 40) go(active + (dx < 0 ? 1 : -1))
    dragStart.current = null
  }

  const enterClass =
    direction === "left"
      ? "animate-slide-in-left"
      : direction === "right"
        ? "animate-slide-in-right"
        : ""
  const exitClass =
    direction === "left"
      ? "animate-slide-out-left"
      : direction === "right"
        ? "animate-slide-out-right"
        : ""

  const activeSlide = slides[active]
  const outgoingSlide = outgoing !== null ? slides[outgoing] : null

  return (
    <>
      {/* Mobile: column. Desktop: row. Main slide must keep width/height on small screens
          (flex-1 + aspect-ratio + max-h collapses to 0 height in some mobile browsers). */}
      <div className="flex w-full min-w-0 select-none flex-col gap-3 md:flex-row md:items-start md:gap-3">
        <div
          className="relative aspect-[16/9] w-full min-h-[180px] shrink-0 overflow-hidden rounded-xl bg-cream md:min-h-0 md:min-w-0 md:max-h-[70vh] md:flex-1"
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
        >
          {outgoingSlide ? (
            <div className={`absolute inset-0 ${exitClass} pointer-events-none`} aria-hidden>
              <SlideMedia slide={{ ...outgoingSlide, alt: "" }} sizes="(max-width: 768px) 100vw, 900px" muted />
            </div>
          ) : null}

          <div
            key={active}
            className={`absolute inset-0 ${outgoing !== null ? enterClass : ""}`}
            onAnimationEnd={endAnim}
          >
            {activeSlide ? (
              <SlideMedia
                slide={{ ...activeSlide, alt: activeAlt }}
                sizes="(max-width: 768px) 100vw, 900px"
                priority={active === 0}
                controls={isVideoUrl(activeSlide.url)}
              />
            ) : null}
          </div>

          {activeSlide && isVideoUrl(activeSlide.url) ? (
            <div className="pointer-events-none absolute left-4 top-4 flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm">
              <Play className="h-3.5 w-3.5 fill-white" aria-hidden /> Видео
            </div>
          ) : null}

          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/50 to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/25 to-transparent" />

          {total > 1 && (
            <div className="absolute left-4 top-4 rounded-full bg-black/40 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
              {active + 1} / {total}
            </div>
          )}

          <button
            type="button"
            onClick={() => setLightbox(active)}
            aria-label="Открыть полноэкранный просмотр"
            className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full bg-black/40 text-white touch-manipulation backdrop-blur-sm transition-colors hover:bg-black/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 sm:right-4 sm:top-4"
          >
            <Expand className="h-4 w-4" aria-hidden />
          </button>

          {total > 1 && (
            <>
              <button
                type="button"
                onClick={() => go(active - 1, "right")}
                aria-label={`Предыдущее ${mediaLabel(slides[(active - 1 + total) % total])}`}
                className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-brand text-white transition-all hover:scale-105 hover:bg-brand-dark active:scale-95"
              >
                <ChevronLeft className="h-6 w-6 stroke-2" />
              </button>

              <button
                type="button"
                onClick={() => go(active + 1, "left")}
                aria-label={`Следующее ${mediaLabel(slides[(active + 1) % total])}`}
                className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-brand text-white transition-all hover:scale-105 hover:bg-brand-dark active:scale-95"
              >
                <ChevronRight className="h-6 w-6 stroke-2" />
              </button>

              <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1.5">
                {list.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => go(i)}
                    aria-label={`${mediaLabel(slides[i])} ${i + 1}`}
                    aria-current={i === active}
                    className={`rounded-full transition-all duration-300 ${
                      i === active ? "h-2 w-6 bg-white" : "h-2 w-2 bg-white/45 hover:bg-white/70"
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {total > 1 && (
          <div className="flex w-full gap-2 py-1 md:h-[min(70vh,calc((100vw-13rem)*9/16))] md:w-40 md:flex-none md:flex-col md:gap-2 md:py-0 lg:w-48">
            <button
              type="button"
              onClick={() => scrollThumbnails("up")}
              disabled={!canScrollUp}
              aria-label="Предыдущие миниатюры"
              className="flex h-20 w-8 shrink-0 items-center justify-center rounded bg-cream text-ink transition-colors hover:bg-brand/20 disabled:opacity-40 md:h-8 md:w-full"
            >
              <ChevronLeft className="h-5 w-5 md:hidden" />
              <ChevronUp className="hidden h-5 w-5 md:block" />
            </button>
            <div
              ref={thumbnailsRef}
              className="flex min-w-0 gap-2 overflow-x-auto scrollbar-none md:max-h-[70vh] md:min-h-0 md:flex-1 md:flex-col md:overflow-x-hidden md:overflow-y-auto"
              style={{ scrollbarWidth: "none" } as React.CSSProperties}
            >
              {slides.map((slide, i) => {
                const video = isVideoUrl(slide.url)
                const isActive = i === active
                return (
                  <button
                    key={slide.url + i}
                    type="button"
                    onClick={() => go(i)}
                    aria-label={`Показать ${mediaLabel(slide)} ${i + 1}`}
                    aria-current={isActive}
                    className={`relative h-20 w-24 shrink-0 overflow-hidden rounded-lg transition-all duration-200 md:h-24 md:w-full lg:h-28 ${
                      isActive
                        ? "ring-2 ring-brand ring-offset-2 opacity-100"
                        : "opacity-60 hover:opacity-90"
                    }`}
                  >
                    <SlideMedia
                      slide={{ ...slide, alt: "" }}
                      sizes="(max-width: 767px) 96px, 192px"
                      objectFit="cover"
                      muted
                    />
                    {video && (
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <div className="flex h-7 w-9 items-center justify-center rounded-xl bg-black/55">
                          <Play className="ml-0.5 h-3.5 w-3.5 fill-white text-white" />
                        </div>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
            <button
              type="button"
              onClick={() => scrollThumbnails("down")}
              disabled={!canScrollDown}
              aria-label="Следующие миниатюры"
              className="flex h-20 w-8 shrink-0 items-center justify-center rounded bg-cream text-ink transition-colors hover:bg-brand/20 disabled:opacity-40 md:h-8 md:w-full"
            >
              <ChevronRight className="h-5 w-5 md:hidden" />
              <ChevronDown className="hidden h-5 w-5 md:block" />
            </button>
          </div>
        )}
      </div>

      {lightbox !== null && (
        <Lightbox
          slides={slides}
          index={lightbox}
          onClose={() => setLightbox(null)}
          onNav={setLightbox}
        />
      )}
    </>
  )
}
