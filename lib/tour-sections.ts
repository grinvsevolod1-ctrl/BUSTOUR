import type { TourSection, TourSectionKey } from "@/lib/types"

export const defaultTourSections: TourSection[] = [
  { key: "dates", label: "\u0414\u0430\u0442\u044b \u0438 \u0446\u0435\u043d\u044b", visible: true },
  { key: "callus", label: "\u0415\u0441\u0442\u044c \u0432\u043e\u043f\u0440\u043e\u0441\u044b?", visible: true },
  { key: "program", label: "\u041f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u0430 \u0442\u0443\u0440\u0430", visible: true },
  { key: "included", label: "\u0427\u0442\u043e \u0432\u0445\u043e\u0434\u0438\u0442 \u0432 \u0442\u0443\u0440", visible: true },
  { key: "gallery", label: "\u0424\u043e\u0442\u043e\u0433\u0430\u043b\u0435\u0440\u0435\u044f", visible: true },
  { key: "seo", label: "\u041e\u043f\u0438\u0441\u0430\u043d\u0438\u0435", visible: true },
  { key: "documents", label: "\u041f\u043e\u043b\u0435\u0437\u043d\u044b\u0435 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u044b", visible: true },
  { key: "faq", label: "\u0427\u0430\u0441\u0442\u044b\u0435 \u0432\u043e\u043f\u0440\u043e\u0441\u044b", visible: true },
  { key: "reviews", label: "\u041e\u0442\u0437\u044b\u0432\u044b", visible: true },
]

export const anchoredSectionKeys: TourSectionKey[] = ["dates", "program", "included", "documents", "reviews"]

/** undefined is legacy/default; [] is an explicit empty layout. */
export function resolveTourLayout(layout: TourSection[] | undefined): TourSection[] {
  if (layout === undefined) return defaultTourSections.map((s) => ({ ...s }))
  if (layout.length === 0) return []
  const known = new Map(defaultTourSections.map((s) => [s.key, s]))
  const seen = new Set<TourSectionKey>()
  const merged: TourSection[] = []
  for (const s of layout) {
    const base = known.get(s.key)
    if (!base || seen.has(s.key)) continue
    seen.add(s.key)
    merged.push({ key: s.key, label: s.label?.trim() || base.label, visible: s.visible })
  }
  return merged
}

export function missingTourSections(active: TourSection[]): TourSection[] {
  const present = new Set(active.map((s) => s.key))
  return defaultTourSections.filter((s) => !present.has(s.key)).map((s) => ({ ...s }))
}
