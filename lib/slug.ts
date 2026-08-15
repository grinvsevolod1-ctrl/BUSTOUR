const translitMap: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i",
  й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t",
  у: "u", ф: "f", х: "h", ц: "c", ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "",
  э: "e", ю: "yu", я: "ya",
}

export const MAX_SLUG_LENGTH = 120

function clampSlug(slug: string): string {
  if (slug.length <= MAX_SLUG_LENGTH) return slug
  const truncated = slug.slice(0, MAX_SLUG_LENGTH)
  const lastHyphen = truncated.lastIndexOf("-")
  return lastHyphen > 0 ? truncated.slice(0, lastHyphen) : truncated
}

export function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .split("")
    .map((ch) => translitMap[ch] ?? ch)
    .join("")
    .replace(/[^a-z0-9_]+/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "")
  return clampSlug(slug) || `item_${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`
}
