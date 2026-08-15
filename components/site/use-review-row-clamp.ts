"use client"

import { useLayoutEffect, type RefObject } from "react"
import { syncReviewRowClamps } from "@/lib/review-row-clamp"

/** Keep review body line-clamp in sync with taller siblings in the same grid row. */
export function useReviewRowClamp(
  gridRef: RefObject<HTMLElement | null>,
  deps: unknown[] = [],
): void {
  useLayoutEffect(() => {
    const grid = gridRef.current
    if (!grid) return

    let raf = 0
    const schedule = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        if (grid.isConnected) syncReviewRowClamps(grid)
      })
    }

    schedule()
    const ro = new ResizeObserver(schedule)
    ro.observe(grid)
    for (const card of grid.querySelectorAll("[data-review-card]")) {
      ro.observe(card)
    }

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- caller passes explicit deps
  }, deps)
}
