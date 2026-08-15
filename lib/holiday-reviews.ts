/**
 * Holiday.by HTML → review rows (pure — no network).
 * Used by /api/admin/parse-holiday-reviews.
 */
import { createHash } from "node:crypto"
import { parse } from "node-html-parser"

export type HolidayParsedReview = {
  name: string
  date: string
  text: string
  sourceId: string
}

export function holidaySourceId(name: string, text: string): string {
  return `holiday_${createHash("sha1").update(`${name}|${text}`).digest("hex").slice(0, 16)}`
}

export function parseHolidayReviewsHtml(html: string): HolidayParsedReview[] {
  const root = parse(html)
  const items = root.querySelectorAll(".comment-card")
  const out: HolidayParsedReview[] = []

  for (const card of items) {
    const name = card.querySelector(".comment-card__name")?.text?.trim() || "Гость"
    const date = card.querySelector(".date-comment-card")?.text?.trim() || ""
    const textEl =
      card.querySelector(".comment-card__content p") ?? card.querySelector(".comment-card__content")
    const text = textEl?.text?.trim() || ""
    if (!text) continue
    out.push({
      name,
      date,
      text,
      sourceId: holidaySourceId(name, text),
    })
  }

  return out
}
