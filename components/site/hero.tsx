"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import Image from "next/image"
import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import type { ContentBlock } from "@/lib/types"

const HERO_FADE_MS = 500
const HERO_AUTOPLAY_MS = 6000

// ⚠️ SSR guard: on the server we render ONLY the FIRST slide.
// This keeps the RSC / SSR payload small, has a single H1, and mounts
// remaining slides lazily only after client hydration completes.
// ⚠️ DO NOT use module-level `typeof window !== "undefined"` here — causes
// Next.js 16 hydration mismatch (server renders isClient=false, client first render true during SSR hydration phase → tree mismatch).
// Instead compute inline at useMemo-time (after mount both server and client *first render* return server-only value, then post-hydrate useEffect kicks in).

export function Hero({ blocks }: { blocks: ContentBlock[] }) {
  const slides = blocks.map((b) => ({
    id: b.id,
    image: b.image || "/placeholder.svg",
    title: b.title,
    subtitle: b.subtitle,
    cta: (b.extra?.buttonText as string) || "Подробнее",
    href: b.href || "/tours/all",
  }))

  const [current, setCurrent] = useState(0)
  const count = slides.length

  const go = useCallback((i: number) => setCurrent((i + count) % count), [count])
  const next = useCallback(() => setCurrent((c) => (c + 1) % count), [count])
  const prev = useCallback(() => setCurrent((c) => (c - 1 + count) % count), [count])

  useEffect(() => {
    if (count <= 1) return
    const id = setInterval(next, HERO_AUTOPLAY_MS)
    return () => clearInterval(id)
  }, [next, count])

  // Which slides should render *right now*?
  //  - SSR (server render): only slide[0] — tiny HTML, one H1.
  //  - Client hydrated: render ALL slides so autoplay can fade between them.
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => { setHydrated(true) }, [])
  const visibleIndices = useMemo(() => {
    if (!hydrated) return new Set([0])
    return new Set(slides.map((_, i) => i))
  }, [slides.length, hydrated])

  if (!count) return null

  return (
    <section className="relative" aria-roledescription="carousel" aria-label="Специальные предложения">
      <div className="relative h-[320px] w-full overflow-hidden md:h-[420px]">
        {slides.map((slide, i) => {
          const active = i === current
          if (!visibleIndices.has(i)) return null

          return (
            <div
              key={slide.id}
              className={`absolute inset-0 transition-opacity ease-out ${active ? "opacity-100" : "pointer-events-none opacity-0"}`}
              style={{ transitionDuration: `${HERO_FADE_MS}ms`, willChange: "opacity" }}
              aria-hidden={!active}
            >
              <Image
                src={slide.image || "/placeholder.svg"}
                alt={slide.title}
                fill
                priority={i === 0}
                loading={i === 0 ? "eager" : "lazy"}
                sizes="100vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-black/30" aria-hidden />
              <div className="absolute inset-0 flex items-center justify-center px-4">
                <div className="w-full max-w-xl space-y-5 rounded bg-black/40 px-6 py-6 text-center backdrop-blur-sm">
                  {/* ⚠️ Strictly ONE <h1> per page — only on slide #0. All other slides use a same-styled heading role element. */}
                  {i === 0 ? (
                    <h1 className="text-balance text-xl font-semibold text-white drop-shadow md:text-2xl">
                      {slide.title}
                    </h1>
                  ) : (
                    <h2 className="text-balance text-xl font-semibold text-white drop-shadow md:text-2xl">
                      {slide.title}
                    </h2>
                  )}
                  {slide.subtitle ? (
                    <p className="text-pretty text-sm text-white/90 drop-shadow md:text-base">
                      {slide.subtitle}
                    </p>
                  ) : null}
                  <Link
                    href={slide.href}
                    tabIndex={active ? undefined : -1}
                    className="inline-block rounded bg-brand px-6 py-3 text-base font-medium text-brand-foreground transition-colors hover:bg-brand-dark"
                  >
                    {slide.cta}
                  </Link>
                </div>
              </div>
            </div>
          )
        })}

        {count > 1 && hydrated ? (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label="Предыдущий слайд"
              className="absolute left-4 top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-black/30 text-white transition-colors hover:bg-black/50"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Следующий слайд"
              className="absolute right-4 top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-black/30 text-white transition-colors hover:bg-black/50"
            >
              <ChevronRight className="h-6 w-6" />
            </button>

            <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-2xl border border-white/50 bg-black/20 px-3 py-1.5">
              {slides.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => go(i)}
                  aria-label={`Слайд ${i + 1}`}
                  aria-current={i === current}
                  className={
                    i === current
                      ? "grid h-4 w-4 place-items-center rounded-full bg-white"
                      : "h-2.5 w-2.5 rounded-full bg-white/70 transition-colors hover:bg-white"
                  }
                >
                  {i === current && <span className="h-1.5 w-1.5 rounded-full bg-brand" />}
                </button>
              ))}
            </div>
          </>
        ) : null}
      </div>
    </section>
  )
}
