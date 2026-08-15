/**
 * CMS is the only editable source for catalog page intro / legacy body.
 * Seed entity columns must not resurrect after admin clears CMS fields (#15–#17).
 */

export type CitySection = { title: string; body: string[] }

/** Prefer CMS string; empty/whitespace means empty (no entity seed fallback). */
export function resolveCmsText(cmsValue: string | null | undefined, _entityFallback?: string): string {
  return String(cmsValue ?? "").trim()
}

/** Legacy city_destinations.sections / .seoHtml must never auto-render on public pages. */
export function shouldRenderLegacyEntityBody(_sectionOrder: string[]): boolean {
  return false
}

export function flattenCitySectionsToHtml(sections: CitySection[]): string {
  const parts: string[] = []
  for (const section of sections) {
    if (section.title?.trim()) parts.push(`<h2>${escapeHtml(section.title.trim())}</h2>`)
    for (const p of section.body ?? []) {
      const t = p.trim()
      if (t) parts.push(`<p>${escapeHtml(t)}</p>`)
    }
  }
  return parts.join("\n")
}

export function parseCitySectionsJson(raw: string | null | undefined): CitySection[] {
  try {
    const parsed = JSON.parse(raw || "[]")
    return Array.isArray(parsed) ? (parsed as CitySection[]) : []
  } catch {
    return []
  }
}

function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}
