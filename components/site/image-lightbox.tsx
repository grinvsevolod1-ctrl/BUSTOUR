"use client"

import { useEffect, useId, useRef, useState } from "react"
import type { PointerEvent, TouchEvent, WheelEvent } from "react"
import { createPortal } from "react-dom"
import Image from "next/image"
import { X } from "lucide-react"

const MIN_ZOOM = 1
const MAX_ZOOM = 4

function clampZoom(value: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value))
}

function touchDistance(touches: { item(index: number): { clientX: number; clientY: number } | null }) {
  const a = touches.item(0)
  const b = touches.item(1)
  if (!a || !b) return 0
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
}

function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [locked])
}

export function ZoomableLightboxImage({
  src,
  alt,
  onZoomChange,
}: {
  src: string
  alt: string
  onZoomChange?: (zoomed: boolean) => void
}) {
  const [scale, setScale] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const dragRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null)
  const pinchRef = useRef<{ distance: number; scale: number } | null>(null)

  useEffect(() => {
    setScale(1)
    setPan({ x: 0, y: 0 })
    dragRef.current = null
    pinchRef.current = null
  }, [src])

  useEffect(() => {
    onZoomChange?.(scale > MIN_ZOOM)
  }, [onZoomChange, scale])

  function resetZoom() {
    setScale(1)
    setPan({ x: 0, y: 0 })
  }

  function onWheel(event: WheelEvent<HTMLDivElement>) {
    event.preventDefault()
    setScale((current) => {
      const next = clampZoom(current + (event.deltaY < 0 ? 0.2 : -0.2))
      if (next === MIN_ZOOM) setPan({ x: 0, y: 0 })
      return next
    })
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (scale <= MIN_ZOOM || event.button !== 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = { x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y }
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current
    if (!drag) return
    setPan({ x: drag.panX + event.clientX - drag.x, y: drag.panY + event.clientY - drag.y })
  }

  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    dragRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  function onTouchStart(event: TouchEvent<HTMLDivElement>) {
    if (event.touches.length !== 2) return
    event.preventDefault()
    pinchRef.current = { distance: touchDistance(event.touches), scale }
  }

  function onTouchMove(event: TouchEvent<HTMLDivElement>) {
    const pinch = pinchRef.current
    if (!pinch || event.touches.length !== 2) return
    event.preventDefault()
    const distance = touchDistance(event.touches)
    const next = clampZoom(pinch.scale * (distance / pinch.distance))
    setScale(next)
    if (next === MIN_ZOOM) setPan({ x: 0, y: 0 })
  }

  function onTouchEnd() {
    pinchRef.current = null
    if (scale <= MIN_ZOOM) resetZoom()
  }

  return (
    <div
      className={`flex h-full w-full items-center justify-center touch-none ${
        scale > MIN_ZOOM ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in"
      }`}
      onWheel={onWheel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDoubleClick={resetZoom}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <img
        src={src}
        alt={alt}
        draggable={false}
        className={
          scale > MIN_ZOOM
            ? "h-auto w-full max-w-none max-h-none select-none object-contain"
            : "max-h-[85dvh] max-w-full select-none object-contain max-md:w-full md:h-auto md:w-auto md:max-w-[80vw]"
        }
        style={{ transform: `scale(${scale}) translate(${pan.x / scale}px, ${pan.y / scale}px)` }}
      />
    </div>
  )
}

/**
 * Click-to-zoom overlay. Portal to body so overflow-hidden thumbs don't clip on mobile.
 * Esc / backdrop / X. Single image — no prev/next.
 */
export function ImageLightbox({
  src,
  alt,
  sizes,
  className,
}: {
  src: string
  alt: string
  sizes: string
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [zoomed, setZoomed] = useState(false)
  const closeRef = useRef<HTMLButtonElement>(null)
  const titleId = useId()

  useEffect(() => setMounted(true), [])
  useBodyScrollLock(open)

  useEffect(() => {
    if (!open) return
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Открыть: ${alt}`}
        className="absolute inset-0 block h-full w-full cursor-zoom-in touch-manipulation"
      >
        <Image src={src} alt={alt} fill sizes={sizes} className={className} />
      </button>

      {mounted && open
        ? createPortal(
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
              onClick={() => setOpen(false)}
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
            >
              <span id={titleId} className="sr-only">
                {alt}
              </span>
              <button
                ref={closeRef}
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Закрыть"
                className="fixed right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-50 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white touch-manipulation transition-colors hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 sm:right-4"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
              <div
                className={
                  zoomed
                    ? "relative h-full w-full max-w-none max-h-none p-0"
                    : "relative h-[min(85dvh,calc(100dvh-1.5rem))] w-full max-w-full md:max-w-[80vw]"
                }
                onClick={(e) => e.stopPropagation()}
              >
                <ZoomableLightboxImage src={src} alt={alt} onZoomChange={setZoomed} />
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  )
}
