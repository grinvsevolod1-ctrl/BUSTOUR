/** Normalize slash query / keywords for fuzzy match (spaces, _, -). */
export function normalizeSlashToken(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[-_\s./\\]+/g, "")
}

/** True if query matches any of the haystacks (substring after normalize, or raw includes). */
export function slashQueryMatches(query: string, haystacks: Array<string | null | undefined>): boolean {
  const raw = query.trim().toLowerCase()
  if (!raw) return true
  const nq = normalizeSlashToken(raw)
  if (!nq) return true

  for (const hay of haystacks) {
    if (!hay) continue
    const lower = hay.toLowerCase()
    if (lower.includes(raw)) return true
    const nh = normalizeSlashToken(hay)
    if (nh.includes(nq) || nq.includes(nh)) return true
  }
  return false
}

/** Expand a shortcode row into searchable tokens (name parts, RU/EN labels, description words). */
export function keywordsFromShortcode(row: {
  name: string
  description?: string | null
  value?: string | null
}): string[] {
  const name = row.name
  const parts = name.split(/[_-]+/).filter(Boolean)
  const desc = row.description ?? ""
  const descWords = desc
    .toLowerCase()
    .replace(/ё/g, "е")
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w.length >= 2)

  return [
    name,
    name.replace(/_/g, "-"),
    name.replace(/_/g, " "),
    name.replace(/[_-]/g, ""),
    ...parts,
    desc,
    ...descWords,
    "shortcode",
    "shortcodes",
    "шорткод",
    "шорткоды",
    `[${name}]`,
  ]
}
