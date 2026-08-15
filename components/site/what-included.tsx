import { Check, X, Star, Circle, Minus } from "lucide-react"
import type { IncludedGroup, IncludedMarker } from "@/lib/types"

const markerIcon: Record<IncludedMarker, typeof Check> = {
  check: Check,
  cross: X,
  star: Star,
  dot: Circle,
  dash: Minus,
}

const markerColor: Record<IncludedMarker, string> = {
  check: "text-success",
  cross: "text-price",
  star: "text-brand",
  dot: "text-ink-muted",
  dash: "text-ink-muted",
}

// Flexible "what's included" block: any number of groups, each with its own
// title and marker icon.
export function WhatIncluded({ groups }: { groups: IncludedGroup[] }) {
  const valid = groups.filter((g) => g.items.length)
  if (!valid.length) return null

  const gridCols =
    valid.length === 1 ? "grid gap-6" :
    valid.length === 2 ? "grid gap-6 sm:grid-cols-2" :
    valid.length === 3 ? "grid gap-6 sm:grid-cols-3" :
    "grid gap-6 sm:grid-cols-2"

  return (
    <section className={gridCols}>
      {valid.map((group, gi) => {
        const Icon = markerIcon[group.marker] ?? Check
        const color = markerColor[group.marker] ?? "text-success"
        return (
          <div key={gi} className="space-y-3 rounded border border-line p-5">
            {group.title ? <h3 className="text-lg font-semibold text-ink">{group.title}</h3> : null}
            <ul className="space-y-2">
              {group.items.map((item, ii) => (
                <li key={ii} className="flex items-start gap-2 text-sm text-ink">
                  <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${color}`} />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )
      })}
    </section>
  )
}
