import { getAnalyticsRuntime, trackAnalyticsEvent } from "@/lib/analytics"

export type PublicReviewInput = {
  name: string
  phone: string
  text: string
  consent: boolean
  captchaToken?: string
  file?: File | null
  /** 1–5, default 5 */
  rating?: number
}

export type PublicReviewResult =
  | { ok: true }
  | { ok: false; errors: Record<string, string> }

export function emitReviewSuccess() {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent("review_success"))
  trackAnalyticsEvent(
    "review_success",
    getAnalyticsRuntime()?.goalReviewSuccess ?? "",
  )
}

/** Submit site «Оставить отзыв» → pending review (approved=false), optional media. */
export async function submitPublicReview(input: PublicReviewInput): Promise<PublicReviewResult> {
  try {
    const body = new FormData()
    body.set("name", input.name)
    body.set("phone", input.phone)
    body.set("text", input.text)
    body.set("consent", input.consent ? "true" : "false")
    if (input.rating != null) body.set("rating", String(input.rating))
    if (input.captchaToken) body.set("captchaToken", input.captchaToken)
    if (input.file) body.set("file", input.file)

    const res = await fetch("/api/review", {
      method: "POST",
      body,
    })
    const data = await res.json()
    if (res.ok && data.ok) {
      emitReviewSuccess()
      return { ok: true }
    }
    return { ok: false, errors: data.errors ?? { form: "Не удалось отправить отзыв" } }
  } catch {
    return { ok: false, errors: { form: "Ошибка сети. Попробуйте позже." } }
  }
}
