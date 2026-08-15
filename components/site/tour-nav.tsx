"use client"

import { scrollToId } from "@/lib/scroll-to-id"

export function TourNav({ items }: { items: { id: string; label: string }[] }) {
  if (!items.length) return null

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>, id: string) {
    e.preventDefault()
    scrollToId(id)
  }

  // Mobile/tablet: 2 columns (4 → 2+2, 6 → 2+2+2…). Single item stays full-width.
  const mobileCols = items.length === 1 ? "grid-cols-1" : "grid-cols-2"

  return (
    <nav
      className={`grid ${mobileCols} gap-3 rounded-xl border border-dashed border-brand bg-white px-3 py-3 sm:px-6 sm:py-4 lg:flex lg:gap-6`}
      aria-label="Разделы тура"
    >
      {items.map((it) => (
        <a
          key={it.id}
          href={`#${it.id}`}
          onClick={(e) => handleClick(e, it.id)}
          className="flex min-h-12 w-full min-w-0 items-center justify-center rounded border border-[#D9E1E2] px-3 py-3 text-center text-sm font-normal text-ink transition-colors hover:border-brand hover:text-brand sm:px-4 sm:text-base lg:flex-1"
        >
          {it.label}
        </a>
      ))}
    </nav>
  )
}
