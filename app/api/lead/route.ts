import { NextResponse } from "next/server"
import { createLead } from "@/lib/queries"
import { notifyLead } from "@/lib/notify"
import { verifyRecaptchaToken } from "@/lib/recaptcha"
import type { LeadType } from "@/lib/types"
import { formatPhoneIfComplete, isSupportedPhone } from "@/lib/lead"

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
const rateStore = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateStore.get(ip)
  if (!entry || now > entry.resetAt) {
    rateStore.set(ip, { count: 1, resetAt: now + RATE_WINDOW })
    return true
  }
  entry.count++
  return entry.count <= RATE_MAX
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ ok: false, errors: { form: "Слишком много заявок. Попробуйте позже." } }, { status: 429 })
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

  // Best-effort notifications (email / Telegram) — never block the response on failure.
  await notifyLead({
    name: data.name,
    phone: data.phone,
    email: data.email || null,
    message: data.message || null,
    tour: data.tour || null,
    type: data.type,
  })

  return NextResponse.json({ ok: true })
}
