/** Short title = entity.title (cards/breadcrumbs). Page H1 = settings `bus:{slug}.h1` or short. */
export function busPageHeading(
  settings: Record<string, string>,
  pageKey: string,
  shortTitle: string,
): string {
  const h1 = settings[`${pageKey}.h1`]?.trim()
  return h1 || shortTitle
}
