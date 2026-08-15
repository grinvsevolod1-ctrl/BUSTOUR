/** Client-safe review text helpers (no Node crypto). */

/** Public form: strip http(s), www., messengers, bare domains from name/text. */
const REVIEW_LINK_RE =
  /(?:https?:\/\/\S+|www\.\S+|(?:t\.me|telegram\.me)\/\S*|\S+\.(?:ru|by|com|net|org|info|xyz|io|cc|tk|me)\b)/giu

export function reviewFieldHasLink(value: string): boolean {
  REVIEW_LINK_RE.lastIndex = 0
  return REVIEW_LINK_RE.test(value)
}

/** Remove link-like tokens; collapse leftover spaces. */
export function stripReviewLinks(value: string): string {
  return value
    .replace(REVIEW_LINK_RE, " ")
    .replace(/[^\S\n]{2,}/g, " ")
    .replace(/ *\n */g, "\n")
    .trim()
}

/** Legacy public-text leak from site form: trailing "Тел: …" block. */
const LEGACY_PHONE_TAIL = /(?:\r?\n)+\s*Тел:\s*[+\d\s().-]{7,40}\s*$/iu
const LEGACY_PHONE_CAPTURE = /(?:\r?\n)+\s*Тел:\s*([+\d\s().-]{7,40})\s*$/iu

const ENTITY_MAP: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
}

/** Remove trailing phone block so public cards never show contact. */
export function stripPublicReviewText(text: string): string {
  return text.replace(LEGACY_PHONE_TAIL, "").trimEnd()
}

export function extractLegacyReviewPhone(text: string): string | null {
  const m = text.match(LEGACY_PHONE_CAPTURE)
  return m?.[1]?.trim() || null
}

function decodeBasicEntities(s: string): string {
  return s
    .replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (full, code: string) => {
      const lower = code.toLowerCase()
      if (lower in ENTITY_MAP) return ENTITY_MAP[lower]!
      if (lower.startsWith("#x")) {
        const n = Number.parseInt(lower.slice(2), 16)
        return Number.isFinite(n) ? String.fromCodePoint(n) : full
      }
      if (lower.startsWith("#")) {
        const n = Number.parseInt(lower.slice(1), 10)
        return Number.isFinite(n) ? String.fromCodePoint(n) : full
      }
      return full
    })
    .replace(/\u00a0/g, " ")
}

/**
 * Public review body as plain text: strip tags/scripts, keep readable content.
 * React still escapes on render — double defense vs XSS.
 */
export function reviewPlainText(text: string): string {
  const base = stripPublicReviewText(text ?? "")
  const noDanger = base
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<\/?[^>]+>/g, "")
  return decodeBasicEntities(noDanger).replace(/[ \t]+\n/g, "\n").trim()
}

const AVATAR_TONES = [
  "bg-sky-100 text-sky-800",
  "bg-violet-100 text-violet-800",
  "bg-emerald-100 text-emerald-800",
  "bg-amber-100 text-amber-900",
  "bg-rose-100 text-rose-800",
  "bg-teal-100 text-teal-800",
  "bg-indigo-100 text-indigo-800",
  "bg-orange-100 text-orange-900",
] as const

/** Stable pastel avatar class from author name. */
export function reviewAvatarTone(name: string): string {
  const s = name.trim() || "?"
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return AVATAR_TONES[h % AVATAR_TONES.length]!
}

/** Sanitize review props before sending to public RSC/client. */
export function toPublicReview(review: import("@/lib/types").Review): import("@/lib/types").Review {
  return {
    ...review,
    text: reviewPlainText(review.text),
    sourceId: "",
  }
}
