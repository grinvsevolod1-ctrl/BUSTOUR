"use client"

import { useState } from "react"
import { Check, Loader2 } from "lucide-react"
import {
  formatPhoneIfComplete,
  sanitizePhoneTyping,
  submitLead,
  validateLead,
  isLeadSubmitEnabled,
  isSupportedPhone,
  type LeadType,
} from "@/lib/lead"
import { captchaClientError, isRecaptchaEnabled } from "@/lib/recaptcha-public"
import { ModalCaptchaRow } from "@/components/site/modals/site-modal-shell"

type Status = "idle" | "sending" | "sent"

export function LeadForm({
  type,
  tour,
  submitLabel = "Отправить",
  showEmail = false,
  showMessage = false,
  successTitle = "Заявка отправлена!",
  successText = "Мы свяжемся с вами в ближайшее время.",
  onSuccess,
}: {
  type: LeadType
  tour?: string
  submitLabel?: string
  showEmail?: boolean
  showMessage?: boolean
  successTitle?: string
  successText?: string
  onSuccess?: () => void
}) {
  const [values, setValues] = useState({ name: "", phone: "", email: "", message: "" })
  const [captcha, setCaptcha] = useState("")
  const [consent, setConsent] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [status, setStatus] = useState<Status>("idle")

  function set(field: keyof typeof values, value: string) {
    setValues((v) => ({ ...v, [field]: value }))
    if (errors[field]) setErrors((e) => ({ ...e, [field]: "" }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const clientErrors = validateLead({ ...values, type })
    if (!consent) clientErrors.consent = "Нужно согласие на обработку персональных данных"
    const captchaErr = captchaClientError(captcha)
    if (captchaErr) clientErrors.captcha = captchaErr
    if (Object.keys(clientErrors).length) {
      setErrors(clientErrors)
      return
    }
    setStatus("sending")
    const result = await submitLead({
      ...values,
      tour,
      type,
      captchaToken: captcha || undefined,
      consent,
    })
    if (result.ok) {
      setStatus("sent")
      onSuccess?.()
    } else {
      setStatus("idle")
      setErrors(result.errors)
    }
  }

  if (status === "sent") {
    return (
      <div className="flex flex-col items-center gap-2 py-6 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-success/10">
          <Check className="h-6 w-6 text-success" />
        </span>
        <p className="font-semibold text-ink">{successTitle}</p>
        <p className="text-sm text-ink-muted">{successText}</p>
      </div>
    )
  }

  const inputClass = (field: string) =>
    `h-12 w-full rounded border px-3 text-base text-ink outline-none focus:border-brand ${
      errors[field] ? "border-price" : "border-line"
    }`

  const captchaOk = !isRecaptchaEnabled() || Boolean(captcha.trim())

  return (
    <form className="space-y-3" onSubmit={handleSubmit} noValidate>
      <div>
        <input
          value={values.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="Ваше имя"
          aria-invalid={!!errors.name}
          className={inputClass("name")}
        />
        {errors.name && <p className="mt-1 text-xs text-price">{errors.name}</p>}
      </div>

      <div>
        <input
          value={values.phone}
          onChange={(e) => set("phone", sanitizePhoneTyping(e.target.value))}
          onBlur={(e) => set("phone", formatPhoneIfComplete(e.target.value))}
          type="tel"
          inputMode="tel"
          placeholder="+375 / +7 …"
          aria-invalid={!!errors.phone}
          className={inputClass("phone")}
        />
        {errors.phone && <p className="mt-1 text-xs text-price">{errors.phone}</p>}
      </div>

      {showEmail && (
        <div>
          <input
            value={values.email}
            onChange={(e) => set("email", e.target.value)}
            type="email"
            placeholder="E-mail"
            aria-invalid={!!errors.email}
            className={inputClass("email")}
          />
          {errors.email && <p className="mt-1 text-xs text-price">{errors.email}</p>}
        </div>
      )}

      {showMessage && (
        <textarea
          value={values.message}
          onChange={(e) => set("message", e.target.value)}
          rows={4}
          placeholder="Сообщение"
          className="w-full rounded border border-line p-3 text-base text-ink outline-none focus:border-brand"
        />
      )}

      <ModalCaptchaRow
        resetKey={type}
        action={type}
        onChange={(token) => {
          setCaptcha(token)
          if (errors.captcha) setErrors((e) => ({ ...e, captcha: "" }))
        }}
        error={errors.captcha}
      />

      {errors.form && <p className="text-sm text-price">{errors.form}</p>}

      <div>
        <label className="flex cursor-pointer items-start gap-2 text-xs leading-4 text-ink-muted">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => {
              setConsent(e.target.checked)
              if (errors.consent) setErrors((err) => ({ ...err, consent: "" }))
            }}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-line accent-brand"
            aria-invalid={!!errors.consent}
          />
          <span>
            Соглашаюсь на обработку{" "}
            <a href="/legal/privacy" className="underline underline-offset-2 hover:text-brand-dark">
              персональных данных
            </a>
          </span>
        </label>
        {errors.consent && <p className="mt-1 text-xs text-price">{errors.consent}</p>}
      </div>

      <button
        type="submit"
        disabled={!isLeadSubmitEnabled(consent, status, captchaOk, isSupportedPhone(values.phone))}
        className="flex h-12 w-full items-center justify-center gap-2 rounded bg-brand text-lg font-semibold text-brand-foreground transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-70"
      >
        {status === "sending" && <Loader2 className="h-5 w-5 animate-spin" />}
        {status === "sending" ? "Отправка…" : submitLabel}
      </button>
    </form>
  )
}
