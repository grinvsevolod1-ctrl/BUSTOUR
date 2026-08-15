import { NextResponse } from "next/server"
import { createLead } from "@/lib/queries"
import { notifyLead } from "@/lib/notify"
import { verifyRecaptchaToken } from "@/lib/recaptcha"
import type { LeadType } from "@/lib/types"
import { formatPhoneIfComplete, isSupportedPhone } from "@/lib/lead"
import { clientIpFromHeaders, consumeRateLimit } from "@/lib/rate-limit"

type LeadPayload = {
  name?: unknown
  phone?: unknown
  email?: unknown
  message?: unknown
  tour?: unknown
  type?: unknown
  captchaToken?: unknown
  consent?: unknown
}

const PHONE_RE = /^\+?[\d\s().-]{7,30}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const VALID_TYPES: LeadType[] = ["booking", "contact", "callback", "rentbus"]

function validate(body: LeadPayload) {
  const errors: Record<string, string> = {}
  const name = typeof body.name === "string" ? body.name.trim() : ""
  const phone = formatPhoneIfComplete(typeof body.phone === "string" ? body.phone.trim() : "")
  const email = typeof body.email === "string" ? body.email.trim() : ""
  const message = typeof body.message === "string" ? body.message.trim() : ""
  const tour = typeof body.tour === "string" ? body.tour.trim() : ""
  const type = (typeof body.type === "string" && VALID_TYPES.includes(body.type as LeadType)
    ? body.type
    : "contact") as LeadType
  const consent = body.consent === true

  if (name.length < 2) errors.name = "Укажите имя (минимум 2 символа)"
  if (!PHONE_RE.test(phone) || !isSupportedPhone(phone)) {
    errors.phone = "Укажите телефон Беларуси или России"
  }
  if (email && !EMAIL_RE.test(email)) errors.email = "Укажите корректный e-mail"
  if (!consent) errors.consent = "Требуется согласие на обработку персональных данных"

  return { errors, data: { name, phone, email, message, tour, type } }
}

const RATE_WINDOW = 60_000 // 1 minute
const RATE_MAX = 5

export async function POST(request: Request) {
  const ip = clientIpFromHeaders(request.headers)
  const rate = consumeRateLimit("lead", ip, RATE_MAX, RATE_WINDOW)
  if (!rate.ok) {
    return NextResponse.json(
      { ok: false, errors: { form: "Слишком много заявок. Попробуйте позже." } },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSec) } },
    )
  }

  let body: LeadPayload
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, errors: { form: "Некорректный запрос" } }, { status: 400 })
  }

  const { errors, data } = validate(body)
  if (Object.keys(errors).length) {
    return NextResponse.json({ ok: false, errors }, { status: 422 })
  }

  const captcha = await verifyRecaptchaToken(body.captchaToken)
  if (!captcha.ok) {
    return NextResponse.json({ ok: false, errors: { captcha: captcha.error } }, { status: 422 })
  }

  try {
    await createLead({
      name: data.name,
      phone: data.phone,
      email: data.email || null,
      message: data.message || null,
      tour: data.tour || null,
      type: data.type,
    })
  } catch (err) {
    console.error("lead save failed:", (err as Error).message)
    return NextResponse.json(
      { ok: false, errors: { form: "Не удалось сохранить заявку. Попробуйте позже." } },
      { status: 500 },
    )
  }

  // Best-effort notifications (email / Telegram) — fire-and-forget, never block the response.
  // Long-lived pm2 process keeps the event loop alive, so `void` is safe here.
  void notifyLead({
    name: data.name,
    phone: data.phone,
    email: data.email || null,
    message: data.message || null,
    tour: data.tour || null,
    type: data.type,
  })

  return NextResponse.json({ ok: true })
}
