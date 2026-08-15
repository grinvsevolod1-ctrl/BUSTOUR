import type { Review } from "@/lib/types"

export const REVIEW_SHOW_ON_OPTIONS = [
  { key: "home", label: "Главная" },
  { key: "testimonials", label: "Страница отзывы" },
  { key: "tour", label: "Страница тура" },
] as const

/** Non-empty tour title = linked (bus tour title from admin combobox). */
export function reviewHasLinkedTour(review: Pick<Review, "tour">): boolean {
  return Boolean(review.tour?.trim())
}

/**
 * TEXT review photos live in `thumbnailUrl`: plain URL (1 file) or JSON string[].
 * VIDEO keeps a single poster URL (never JSON).
 */
export function parseReviewPhotoUrls(raw: string | undefined | null): string[] {
  const v = (raw ?? "").trim()
  if (!v) return []
  if (v.startsWith("[")) {
    try {
      const parsed: unknown = JSON.parse(v)
      if (!Array.isArray(parsed)) return []
      return parsed
        .filter((x): x is string => typeof x === "string" && Boolean(x.trim()))
        .map((s) => s.trim())
    } catch {
      return []
    }
  }
  return [v]
}

export function serializeReviewPhotoUrls(urls: string[]): string {
  const clean = urls.map((u) => u.trim()).filter(Boolean)
  if (clean.length === 0) return ""
  if (clean.length === 1) return clean[0]!
  return JSON.stringify(clean)
}

export function primaryReviewPhotoUrl(raw: string | undefined | null): string {
  return parseReviewPhotoUrls(raw)[0] ?? ""
}

/** Drop «tour» showOn key when review is not linked to a tour. */
export function sanitizeReviewShowOn(showOn: string[], hasLinkedTour: boolean): string[] {
  if (hasLinkedTour) return showOn
  return showOn.filter((k) => k !== "tour")
}

export type ReviewShowOnKey = (typeof REVIEW_SHOW_ON_OPTIONS)[number]["key"]

export type ReviewListFilters = {
  sort: "newest" | "oldest"
  status: "all" | "pending" | "approved"
  kind: "all" | "text" | "video"
  showOn: "all" | ReviewShowOnKey
}

export const DEFAULT_REVIEW_LIST_FILTERS: ReviewListFilters = {
  sort: "newest",
  status: "all",
  kind: "all",
  showOn: "all",
}

export function isVideoReview(review: Pick<Review, "type" | "videoUrl">): boolean {
  return review.type === "VIDEO" || Boolean(review.videoUrl?.trim())
}

function sortKey(review: Review): number {
  const raw = review.sourceDate?.trim()
  if (raw) {
    const ts = Date.parse(raw.includes("T") ? raw : `${raw}T00:00:00Z`)
    if (Number.isFinite(ts)) return ts
  }
  return review.id
}

export function filterAndSortReviews(
  reviews: Review[],
  filters: ReviewListFilters,
): Review[] {
  let list = reviews.filter((review) => !review.archived)

  if (filters.status === "pending") list = list.filter((r) => !r.approved)
  if (filters.status === "approved") list = list.filter((r) => r.approved)

  if (filters.kind === "video") list = list.filter(isVideoReview)
  if (filters.kind === "text") list = list.filter((r) => !isVideoReview(r))

  if (filters.showOn !== "all") {
    list = list.filter((r) => (r.showOn ?? []).includes(filters.showOn))
  }

  const dir = filters.sort === "oldest" ? 1 : -1
  return [...list].sort((a, b) => (sortKey(a) - sortKey(b)) * dir || (a.id - b.id) * dir)
}

export function toggleShowOn(current: string[], key: string): string[] {
  return current.includes(key) ? current.filter((k) => k !== key) : [...current, key]
}

/** Empty showOn = legacy «везде»; иначе строгое вхождение ключа. */
export function reviewShowsOn(review: Pick<Review, "showOn">, key: ReviewShowOnKey): boolean {
  const places = review.showOn ?? []
  if (!places.length) return true
  return places.includes(key)
}

/** Photos or playable video → media block on public cards. */
export function reviewHasMedia(review: Pick<Review, "type" | "videoUrl" | "thumbnailUrl">): boolean {
  if (isVideoReview(review)) return Boolean(review.videoUrl?.trim())
  return parseReviewPhotoUrls(review.thumbnailUrl).length > 0
}

/** Public card date: sourceDate as-is (or ru-RU for ISO), else createdAt. */
export function formatReviewDisplayDate(review: Pick<Review, "sourceDate" | "createdAt">): string {
  const raw = review.sourceDate?.trim()
  if (raw) {
    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
      const ts = Date.parse(raw.includes("T") ? raw : `${raw}T00:00:00`)
      if (Number.isFinite(ts)) return new Date(ts).toLocaleDateString("ru-RU")
    }
    return raw
  }
  if (review.createdAt) return new Date(review.createdAt).toLocaleDateString("ru-RU")
  return ""
}

