import { NextResponse } from "next/server"
import { createReview } from "@/lib/queries"
import { mediaService, validateMediaFile } from "@/lib/media-service"
import { notifyLead, phoneCorrelationTag } from "@/lib/notify"
import { encodeReviewPhoneSourceId } from "@/lib/review-contact"
import { formatPhoneIfComplete, isSupportedPhone } from "@/lib/lead"
import { verifyRecaptchaToken } from "@/lib/recaptcha"
import { stripReviewLinks } from "@/lib/review-utils"
import { clientIpFromHeaders, consumeRateLimit } from "@/lib/rate-limit"

export const runtime = "nodejs"
/** Review media may run image/video normalize. */
export const maxDuration = 180

const PHONE_RE = /^\+?[\d\s().-]{7,20}$/

const RATE_WINDOW = 5 * 60_000 // 5 minutes
const RATE_MAX = 3 // 3 reviews per IP in window

function str(v: FormDataEntryValue | null): string {
  return typeof v === "string" ? v.trim() : ""
}

function truthyConsent(v: FormDataEntryValue | null): boolean {
  if (typeof v !== "string") return false
  const t = v.trim().toLowerCase()
  return t === "1" || t === "true" || t === "on" || t === "yes"
}

export async function POST(request: Request) {
  const ip = clientIpFromHeaders(request.headers)
  const rate = consumeRateLimit("review", ip, RATE_MAX, RATE_WINDOW)
  if (!rate.ok) {
    return NextResponse.json(
      { ok: false, errors: { form: "Слишком много отзывов. Попробуйте позже." } },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSec) } },
    )
  }

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ ok: false, errors: { form: "Некорректный запрос" } }, { status: 400 })
  }

  const name = stripReviewLinks(str(form.get("name")))
  const phone = formatPhoneIfComplete(str(form.get("phone")))
  const text = stripReviewLinks(str(form.get("text")))
  const captchaToken = str(form.get("captchaToken"))
  const consent = truthyConsent(form.get("consent"))
  const ratingRaw = Number(str(form.get("rating")) || "5")
  const rating = Number.isFinite(ratingRaw) ? Math.min(5, Math.max(1, Math.round(ratingRaw))) : 5
  const fileEntry = form.get("file")
  const file = fileEntry instanceof File && fileEntry.size > 0 ? fileEntry : null

  const errors: Record<string, string> = {}
  if (name.length < 2) errors.name = "Укажите имя (минимум 2 символа)"
  if (!PHONE_RE.test(phone) || !isSupportedPhone(phone)) errors.phone = "Укажите телефон Беларуси или России"
  if (!text) errors.text = "Добавьте текст отзыва"
  if (!consent) errors.consent = "Нужно согласие на обработку персональных данных"

  let mediaType: "image" | "video" | null = null
  if (file) {
    const validation = validateMediaFile(file)
    if (!validation.type || (validation.type !== "image" && validation.type !== "video")) {
      errors.media = validation.error || "Можно прикрепить только фото или видео"
    } else {
      mediaType = validation.type
    }
  }

  if (Object.keys(errors).length) {
    return NextResponse.json({ ok: false, errors }, { status: 422 })
  }

  const captcha = await verifyRecaptchaToken(captchaToken || undefined, { required: true })
  if (!captcha.ok) {
    return NextResponse.json({ ok: false, errors: { captcha: captcha.error } }, { status: 422 })
  }

  let mediaUrl = ""
  if (file && mediaType) {
    try {
      const uploaded = await mediaService.saveFile(file)
      const ready = uploaded.status === "ready" ? uploaded : await mediaService.waitForMediaReady(uploaded.id)
      mediaUrl = ready.url
    } catch (err) {
      console.error("review media upload failed:", (err as Error).message)
      return NextResponse.json(
        { ok: false, errors: { media: "Не удалось загрузить файл. Попробуйте позже." } },
        { status: 500 },
      )
    }
  }

  const isVideo = mediaType === "video"

  try {
    await createReview({
      type: isVideo ? "VIDEO" : "TEXT",
      name,
      tour: "",
      text,
      rating,
      source: "manual",
      sourceId: encodeReviewPhoneSourceId(phone),
      sourceDate: "",
      approved: false,
      videoUrl: isVideo ? mediaUrl : "",
      thumbnailUrl: mediaType === "image" ? mediaUrl : "",
    })
  } catch (err) {
    console.error("review save failed:", (err as Error).message)
    return NextResponse.json(
      { ok: false, errors: { form: "Не удалось сохранить отзыв. Попробуйте позже." } },
      { status: 500 },
    )
  }

  // Notify staff — NO plaintext phone/PII in content: only hashed correlation id (matches server logs)
  void notifyLead({
    type: "contact",
    name: name.length > 0 ? "Пользователь" : "",
    phone: phoneCorrelationTag(phone),
    message: `Новый отзыв на модерацию. CorrelationId: ${phoneCorrelationTag(phone)}`,
  })

  return NextResponse.json({ ok: true })
}
