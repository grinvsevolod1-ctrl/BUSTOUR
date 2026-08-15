"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { resortCardsPageSize, type ResortCardsLayout } from "@/lib/resort-cards-settings"
import { cn } from "@/lib/utils"

export type ResortCardItem = {
  slug: string
  name: string
  href: string
  image?: string
}

function subscribeGridCols(onStoreChange: () => void) {
  const sm = window.matchMedia("(min-width: 640px)")
  const lg = window.matchMedia("(min-width: 1024px)")
  sm.addEventListener("change", onStoreChange)
  lg.addEventListener("change", onStoreChange)
  return () => {
    sm.removeEventListener("change", onStoreChange)
    lg.removeEventListener("change", onStoreChange)
  }
}

function gridColsSnapshot(): number {
  if (window.matchMedia("(min-width: 1024px)").matches) return 3
  if (window.matchMedia("(min-width: 640px)").matches) return 2
  return 1
}

function useGridCols(): number {
  return useSyncExternalStore(subscribeGridCols, gridColsSnapshot, () => 3)
}

function ResortCard({
  city,
  priority,
  mobileSnap,
}: {
  city: ResortCardItem
  priority?: boolean
  /** Fixed peek width for horizontal mobile strip */
  mobileSnap?: boolean
}) {
  return (
    <Link
      href={city.href}
      className={cn(
        "group relative h-[280px] overflow-hidden rounded",
        mobileSnap
          ? "w-[min(100%,280px)] min-w-[280px] shrink-0 snap-start"
          : "w-full",
      )}
    >
      {city.image ? (
        <Image
          src={city.image}
          alt={city.name}
          fill
          sizes={
            mobileSnap
              ? "280px"
              : "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          }
          className="object-cover"
          priority={priority}
        />
      ) : (
        <div className="absolute inset-0 bg-ink" aria-hidden />
      )}
      <div className="absolute inset-0 bg-black/20" aria-hidden />
      <div className="relative z-10 flex h-full flex-col items-center justify-between px-4 py-8">
        <h3 className="text-center text-2xl font-semibold leading-8 text-white">{city.name}</h3>
        <span className="rounded bg-[#F0B336] px-4 py-3 text-base text-[#222] transition-colors group-hover:bg-[#f5c45d]">
          Подробнее
        </span>
      </div>
    </Link>
  )
}

/** Mobile: horizontal snap strip (no endless vertical stack). */
function MobileSnapCarousel({ items }: { items: ResortCardItem[] }) {
  const scrollerRef = useRef<HTMLDivElement>(null)

  const scrollByCard = (dir: -1 | 1) => {
    const el = scrollerRef.current
    if (!el) return
    el.scrollBy({ left: dir * Math.min(300, el.clientWidth * 0.85), behavior: "smooth" })
  }

  return (
    <div className="relative">
      {items.length > 1 ? (
        <div className="mb-2 flex justify-end gap-2">
          <button
            type="button"
            aria-label="Предыдущий курорт"
            className="grid h-9 w-9 place-items-center rounded-full border border-line bg-white text-ink shadow-sm"
            onClick={() => scrollByCard(-1)}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="Следующий курорт"
            className="grid h-9 w-9 place-items-center rounded-full border border-line bg-white text-ink shadow-sm"
            onClick={() => scrollByCard(1)}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      ) : null}
      <div
        ref={scrollerRef}
        aria-roledescription="carousel"
        aria-label="Курорты"
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((city, i) => (
          <ResortCard
            key={`${city.slug}-${city.href}`}
            city={city}
            mobileSnap
            priority={i === 0}
          />
        ))}
      </div>
    </div>
  )
}

/** sm+ grid with optional Motion page flip (CMS cities.rows / cities.paginate). */
function DesktopGridPager({
  items,
  cols,
  rows,
  paginate,
}: {
  items: ResortCardItem[]
  cols: number
  rows: ResortCardsLayout["rows"]
  paginate: boolean
}) {
  const reduceMotion = useReducedMotion()
  const pageSize = resortCardsPageSize(cols, rows)
  const shouldPage = paginate && items.length > pageSize
  const pageCount = shouldPage ? Math.ceil(items.length / pageSize) : 1

  const [page, setPage] = useState(0)
  const [dir, setDir] = useState<1 | -1>(1)

  useEffect(() => {
    setPage((p) => Math.min(p, Math.max(0, pageCount - 1)))
  }, [pageCount])

  const safePage = Math.min(page, pageCount - 1)
  const visible = shouldPage
    ? items.slice(safePage * pageSize, safePage * pageSize + pageSize)
    : items

  const go = (next: number) => {
    if (!shouldPage) return
    const clamped = Math.max(0, Math.min(pageCount - 1, next))
    if (clamped === safePage) return
    setDir(clamped > safePage ? 1 : -1)
    setPage(clamped)
  }

  const gridClass = cols >= 3 ? "grid-cols-3" : "grid-cols-2"

  return (
    <div className="relative space-y-4">
      {shouldPage ? (
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            aria-label="Предыдущая страница курортов"
            disabled={safePage <= 0}
            className="grid h-9 w-9 place-items-center rounded-full border border-line bg-white text-ink shadow-sm transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
            onClick={() => go(safePage - 1)}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="min-w-[3.5rem] text-center text-sm text-ink-muted" aria-live="polite">
            {safePage + 1} / {pageCount}
          </span>
          <button
            type="button"
            aria-label="Следующая страница курортов"
            disabled={safePage >= pageCount - 1}
            className="grid h-9 w-9 place-items-center rounded-full border border-line bg-white text-ink shadow-sm transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
            onClick={() => go(safePage + 1)}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      ) : null}

      <div className="overflow-hidden" aria-roledescription={shouldPage ? "carousel" : undefined}>
        <AnimatePresence mode="wait" initial={false} custom={dir}>
          <motion.div
            key={shouldPage ? `page-${safePage}-c${cols}-r${rows}` : "all"}
            custom={dir}
            initial={
              reduceMotion || !shouldPage
                ? false
                : { opacity: 0, x: dir * 28 }
            }
            animate={{ opacity: 1, x: 0 }}
            exit={reduceMotion || !shouldPage ? undefined : { opacity: 0, x: dir * -28 }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { type: "spring", stiffness: 380, damping: 34, mass: 0.8 }
            }
            style={{ willChange: reduceMotion || !shouldPage ? undefined : "transform, opacity" }}
            className={cn("grid gap-4", gridClass)}
          >
            {visible.map((city, i) => (
              <ResortCard
                key={`${city.slug}-${city.href}`}
                city={city}
                priority={safePage === 0 && i < cols}
              />
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

/** Client-only; items must be plain serializable data (no function props). */
export function ResortCardsCarousel({
  items,
  rows = 2,
  paginate = true,
}: {
  items: ResortCardItem[]
  rows?: ResortCardsLayout["rows"]
  paginate?: boolean
}) {
  const cols = useGridCols()
  // CSS dual-render: no hydrate flash. Mobile snap <sm; desktop grid sm+.
  // Desktop pager only uses sm/lg cols (2|3); clamp so mobile matchMedia never feeds a 1-col grid.
  const desktopCols = cols >= 3 ? 3 : 2
  return (
    <>
      <div className="sm:hidden">
        <MobileSnapCarousel items={items} />
      </div>
      <div className="hidden sm:block">
        <DesktopGridPager items={items} cols={desktopCols} rows={rows} paginate={paginate} />
      </div>
    </>
  )
}
