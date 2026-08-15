"use client"

import { useEffect, useState } from "react"
import { formatPhoneIfComplete, isSupportedPhone, sanitizePhoneTyping, submitLead, validateLead } from "@/lib/lead"
import { captchaClientError } from "@/lib/recaptcha-public"
import {
  ModalCaptchaRow,
  ModalConsentNote,
  ModalDivider,
  ModalField,
  ModalSubmitButton,
  ModalSuccess,
  SiteModalShell,
  modalFormClass,
  modalInputClass,
  modalTextareaClass,
  useScheduleModalClose,
} from "./site-modal-shell"

export function ModalTourOrder({
  open,
  onClose,
  tourTitle = "",
  tourDate = "",
  title = "Заказать тур",
  productLabel = "Название тура:",
  dateLabel = "Дата тура:",
  requireEmail = true,
}: {
  open: boolean
  onClose: () => void
  tourTitle?: string
  tourDate?: string
  /** Dialog heading — default tour order. */
  title?: string
  productLabel?: string
  dateLabel?: string
  /** Tour booking requires email; transfer / compact paths may skip it. */
  requireEmail?: boolean
}) {
  const scheduleClose = useScheduleModalClose(onClose)
  const [values, setValues] = useState({
    name: "",
    phone: "",
    email: "",
    date: tourDate,
    message: "",
    captcha: "",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle")
const [consent, setConsent] = useState(false)

  useEffect(() => {
    if (!open) return
    setValues((v) => ({ ...v, date: tourDate }))
    setStatus("idle")
    setErrors({})
  }, [open, tourDate])

  function set(field: keyof typeof values, value: string) {
    setValues((v) => ({ ...v, [field]: value }))
    if (errors[field]) setErrors((e) => ({ ...e, [field]: "" }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const next = validateLead({
      name: values.name,
      phone: values.phone,
      email: requireEmail ? values.email : undefined,
      type: "booking",
    })
    if (requireEmail && !values.email.trim()) next.email = "Укажите e-mail"
    if (!values.date.trim()) {
      next.date = dateLabel.toLowerCase().includes("время")
        ? "Укажите время отправления"
        : "Укажите дату тура"
    }
    if (!consent) next.consent = "Нужно согласие на обработку персональных данных"
    const captchaErr = captchaClientError(values.captcha)
    if (captchaErr) next.captcha = captchaErr
    if (Object.keys(next).length) {
      setErrors(next)
      return
    }
    setStatus("sending")
    const result = await submitLead({
      type: "booking",
      name: values.name.trim(),
      phone: values.phone,
      email: requireEmail ? values.email.trim() : undefined,
      tour: tourTitle,
      message: [`Дата тура: ${values.date.trim()}`, values.message.trim() ? `Комментарий: ${values.message.trim()}` : ""]
        .filter(Boolean)
        .join("\n"),
      captchaToken: values.captcha || undefined,
      consent,
    })
    if (result.ok) {
      setStatus("sent")
      scheduleClose()
    } else {
      setStatus("idle")
      setErrors(result.errors)
    }
  }

  return (
    <SiteModalShell open={open} onClose={onClose} title={title} titleId="modal-tour-order-title">
      {status === "sent" ? (
        <ModalSuccess title="Заявка отправлена!" text="Мы свяжемся с вами для подтверждения." />
      ) : (
        <form className={modalFormClass} onSubmit={handleSubmit} noValidate>
          {tourTitle ? (
            <div className="rounded-md border border-line bg-cream/80 px-3 py-2">
              <p className="text-xs text-ink-muted">{productLabel.replace(/:$/, "")}</p>
              <p className="truncate text-sm font-medium text-ink" title={tourTitle}>
                {tourTitle}
              </p>
            </div>
          ) : (
            <ModalField label={productLabel} required>
              <input value={tourTitle} disabled readOnly className={modalInputClass(false, true)} />
            </ModalField>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <ModalField label="Имя:" required error={errors.name}>
              <input
                name="name"
                autoComplete="name"
                value={values.name}
                onChange={(e) => set("name", e.target.value)}
                className={modalInputClass(!!errors.name)}
                aria-invalid={!!errors.name}
              />
            </ModalField>
            <ModalField label="Телефон:" required error={errors.phone}>
              <input
                name="phone"
                autoComplete="tel"
                value={values.phone}
                onChange={(e) => set("phone", sanitizePhoneTyping(e.target.value))}
                onBlur={(e) => set("phone", formatPhoneIfComplete(e.target.value))}
                type="tel"
                inputMode="tel"
                className={modalInputClass(!!errors.phone)}
                aria-invalid={!!errors.phone}
              />
            </ModalField>
          </div>

          {requireEmail ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <ModalField label="E-mail:" required error={errors.email}>
                <input
                  name="email"
                  autoComplete="email"
                  type="email"
                  spellCheck={false}
                  value={values.email}
                  onChange={(e) => set("email", e.target.value)}
                  className={modalInputClass(!!errors.email)}
                  aria-invalid={!!errors.email}
                />
              </ModalField>
              <ModalField label={dateLabel} required error={errors.date}>
                <input
                  name="tour-date"
                  autoComplete="off"
                  value={values.date}
                  onChange={(e) => set("date", e.target.value)}
                  placeholder="дд.мм.гггг…"
                  className={modalInputClass(!!errors.date)}
                  aria-invalid={!!errors.date}
                />
              </ModalField>
            </div>
          ) : (
            <ModalField label={dateLabel} required error={errors.date}>
              <input
                name="tour-date"
                autoComplete="off"
                value={values.date}
                onChange={(e) => set("date", e.target.value)}
                placeholder="дд.мм.гггг…"
                className={modalInputClass(!!errors.date)}
                aria-invalid={!!errors.date}
              />
            </ModalField>
          )}

          <ModalField label="Комментарий:">
            <textarea
              name="message"
              value={values.message}
              onChange={(e) => set("message", e.target.value)}
              rows={2}
              className={modalTextareaClass}
            />
          </ModalField>

          <ModalDivider />
          <ModalCaptchaRow
            resetKey={open}
            action="booking"
            onChange={(v) => set("captcha", v)}
            error={errors.captcha}
          />
          <label className="flex cursor-pointer items-start gap-2 text-xs leading-4 text-ink">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => {
                setConsent(e.target.checked)
                if (errors.consent) setErrors((err) => ({ ...err, consent: "" }))
              }}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-line accent-brand"
            />
            <span>
              Согласен(на) на обработку{" "}
              <a href="/legal/privacy" className="underline underline-offset-2 hover:text-brand-dark">
                персональных данных
              </a>
              <span className="text-price"> *</span>
            </span>
          </label>
          {errors.consent ? (
            <p className="text-xs text-price" role="alert">
              {errors.consent}
            </p>
          ) : null}
          {errors.form ? (
            <p className="text-sm text-price" role="alert">
              {errors.form}
            </p>
          ) : null}
          <ModalSubmitButton
            pending={status === "sending"}
            consent={consent}
            captchaToken={values.captcha}
            phoneValid={isSupportedPhone(values.phone)}
          >
            Отправить заявку
          </ModalSubmitButton>
        </form>
      )}
    </SiteModalShell>
  )
}
