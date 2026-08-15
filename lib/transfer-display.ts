/** Short title = entity.title (cards/breadcrumbs). Page H1 = settings `transfer:{slug}.h1` or short. */
export function transferPageHeading(
  settings: Record<string, string>,
  pageKey: string,
  shortTitle: string,
): string {
  const h1 = settings[`${pageKey}.h1`]?.trim()
  return h1 || shortTitle
}

export const TRANSFER_SCHEDULE_DEFAULT_TITLES = {
  outbound: "Расписание из Минска в аэропорт",
  return: "Расписание из аэропорта в Минск",
} as const

export function transferScheduleCmsKeys(
  pageKey: string,
  direction: "outbound" | "return",
) {
  const prefix = `${pageKey}.schedule.${direction}`
  return {
    title: `${prefix}.title`,
    beforeHtml: `${prefix}.beforeHtml`,
    afterTitle: `${prefix}.afterTitle`,
    afterHtml: `${prefix}.afterHtml`,
    colWidths: `${prefix}.colWidths`,
  } as const
}

export function resolveTransferScheduleTitle(
  settings: Record<string, string>,
  pageKey: string,
  direction: "outbound" | "return",
): string {
  const custom = settings[transferScheduleCmsKeys(pageKey, direction).title]?.trim()
  return custom || TRANSFER_SCHEDULE_DEFAULT_TITLES[direction]
}

/** #110: legacy `content*` → standard `seo*` (no DB write; read-path only). */
export function withTransferSeoAlias(
  settings: Record<string, string>,
  pageKey: string,
): Record<string, string> {
  const out = { ...settings }
  const alias: [string, string][] = [
    ["contentTitle", "seoTitle"],
    ["contentHtml", "seoHtml"],
    ["section.content", "section.seo"],
  ]
  for (const [from, to] of alias) {
    const fk = `${pageKey}.${from}`
    const tk = `${pageKey}.${to}`
    if (out[tk] === undefined && out[fk] !== undefined) out[tk] = out[fk]
  }
  const orderKey = `${pageKey}.sections.order`
  const raw = out[orderKey]
  if (raw?.includes('"content"')) {
    try {
      const arr = JSON.parse(raw) as unknown
      if (Array.isArray(arr)) {
        out[orderKey] = JSON.stringify(
          arr.map((k) => (k === "content" ? "seo" : k)),
        )
      }
    } catch {
      /* keep raw */
    }
  }
  return out
}
