import { parsePhoneNumberFromString } from "libphonenumber-js/core"
import metadata from "libphonenumber-js/metadata.min.json"
import { getAnalyticsRuntime, trackAnalyticsEvent } from "@/lib/analytics"

export type LeadType = "booking" | "contact" | "callback" | "rentbus"

export type LeadInput = {
  name: string
  phone: string
  email?: string
  message?: string
  tour?: string
  type: LeadType
  /** Google reCAPTCHA v3 response token */
  captchaToken?: string
  consent: boolean
}

export type LeadResult =
  | { ok: true }
  | { ok: false; errors: Record<string, string> }

const PHONE_RE = /^\+?[\d\s().-]{7,30}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const BY_OPERATOR_CODES = new Set(["25", "29", "33", "44"])

type PhoneMeta = Parameters<typeof parsePhoneNumberFromString>[2]

/** Allow digits and common phone punctuation while typing — no forced country mask. */
export function sanitizePhoneTyping(value: string): string {
  const cleaned = value.replace(/[^\d+()\s-]/g, "")
  let out = ""
  let seenPlus = false
  for (const ch of cleaned) {
    if (ch === "+") {
      if (out.length === 0 && !seenPlus) {
        out += "+"
        seenPlus = true
      }
      continue
    }
    out += ch
  }
  return out.slice(0, 30)
}

/**
 * Format only when libphonenumber says the number is complete/valid.
 * Tries BY then RU (CIS trunk `8…`), leaves incomplete input unchanged.
 * UX: free typing on change; call this on blur.
 * @see https://github.com/catamphetamine/libphonenumber-js
 */
export function formatPhoneIfComplete(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ""
  const digits = trimmed.replace(/\D/g, "")
  let normalized = trimmed
  if (digits.length === 9 && BY_OPERATOR_CODES.has(digits.slice(0, 2))) normalized = `+375${digits}`
  else if (digits.length === 11 && digits.startsWith("80")) normalized = `+375${digits.slice(2)}`
  else if (digits.length === 11 && digits.startsWith("8") && digits[1] !== "0") normalized = `+7${digits.slice(1)}`
  const meta = metadata as PhoneMeta
  for (const country of ["BY", "RU"] as const) {
    const parsed = parsePhoneNumberFromString(normalized, country, meta)
    if (parsed?.isValid() && (parsed.country === "BY" || parsed.country === "RU")) return parsed.formatInternational()
  }
  return trimmed
}

export function isSupportedPhone(value: string): boolean {
  const formatted = formatPhoneIfComplete(value)
  const digits = formatted.replace(/\D/g, "")
  return (formatted.startsWith("+375") && digits.length === 12) || (formatted.startsWith("+7") && digits.length === 11)
}

/** @deprecated Prefer sanitizePhoneTyping — alias for older call sites. */
export function maskPhone(value: string): string {
  return sanitizePhoneTyping(value)
}

/** Client-side validation mirroring the server rules. */
export function validateLead(input: Partial<LeadInput>): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!input.name || input.name.trim().length < 2) errors.name = "Укажите имя"
  const phone = input.phone?.trim() ?? ""
  if (!PHONE_RE.test(phone) || !isSupportedPhone(phone)) errors.phone = "Укажите телефон Беларуси или России"
  if (input.email && input.email.trim() && !EMAIL_RE.test(input.email.trim()))
    errors.email = "Некорректный e-mail"
  return errors
}

/**
 * Submit enabled with privacy consent, not already sending,
 * and (when captcha enabled) a client token present (`captchaOk`).
 */
export function isLeadSubmitEnabled(
  consent: boolean,
  status: "idle" | "sending" | "sent",
  captchaOk = true,
  phoneOk = true,
): boolean {
  return consent && status !== "sending" && captchaOk && phoneOk
}

export async function submitLead(input: LeadInput): Promise<LeadResult> {
  try {
    const res = await fetch("/api/lead", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
    const data = await res.json()
    if (res.ok && data.ok) {
      emitLeadSuccess({ type: input.type, tour: input.tour })
      return { ok: true }
    }
    return { ok: false, errors: data.errors ?? { form: "Не удалось отправить заявку" } }
  } catch {
    return { ok: false, errors: { form: "Ошибка сети. Попробуйте позже." } }
  }
}

/** Metrika/GTM hook after successful lead POST (not on validation errors). */
export function emitLeadSuccess(detail: { type: string; tour?: string }) {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent("lead_success", { detail }))
  const config = getAnalyticsRuntime()
  const goalId =
    detail.type === "callback" ? config?.goalCallbackSuccess : config?.goalLeadSuccess
  trackAnalyticsEvent("lead_success", goalId ?? "", {
    leadType: detail.type,
    tour: detail.tour,
  })
}
