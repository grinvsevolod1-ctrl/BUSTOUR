"use client"

import { useState } from "react"
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

type Values = {
  name: string
  phone: string
  email: string
  from: string
  to: string
  passengers: string
  payment: string
  departure: string
  returnDate: string
  comment: string
  captcha: string
}

const initial: Values = {
  name: "",
  phone: "",
  email: "",
  from: "Минск",
  to: "",
  passengers: "",
  payment: "Безналичный расчет",
  departure: "",
  returnDate: "",
  comment: "",
  captcha: "",
}

/** Below Tailwind `sm` — short phone-first form. */
function isCompactBusForm() {
  return typeof window !== "undefined" && !window.matchMedia("(min-width: 640px)").matches
}

export function ModalBusOrder({
  open,
  onClose,
  busTitle = "",
}: {
  open: boolean
  onClose: () => void
  busTitle?: string
}) {
  const scheduleClose = useScheduleModalClose(onClose)
  const [values, setValues] = useState(initial)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle")
const [consent, setConsent] = useState(false)

  function set(field: keyof Values, value: string) {
    setValues((v) => ({ ...v, [field]: value }))
    if (errors[field]) setErrors((e) => ({ ...e, [field]: "" }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const compact = isCompactBusForm()
    const next = validateLead({
      name: values.name,
      phone: values.phone,
      email: compact ? undefined : values.email,
      type: "rentbus",
    })
    if (!compact) {
      if (!values.email.trim()) next.email = "Укажите e-mail"
      if (!values.from.trim()) next.from = "Укажите место отправления"
      if (!values.to.trim()) next.to = "Укажите место назначения"
      if (!values.passengers || Number(values.passengers) < 1) next.passengers = "Укажите число пассажиров"
      if (!values.departure) next.departure = "Укажите дату отправления"
      if (!values.returnDate) next.returnDate = "Укажите дату возвращения"
    }
    if (!consent) next.consent = "Нужно согласие на обработку персональных данных"
    const captchaErr = captchaClientError(values.captcha)
    if (captchaErr) next.captcha = captchaErr
    if (Object.keys(next).length) {
      setErrors(next)
      return
    }

    setStatus("sending")
    const message = compact
      ? "Мобильная заявка — детали поездки уточнить по телефону"
      : [
          `Откуда: ${values.from.trim()}`,
          `Куда: ${values.to.trim()}`,
          `Количество пассажиров: ${values.passengers}`,
          `Форма оплаты: ${values.payment}`,
          `Дата отправления: ${values.departure}`,
          `Дата возвращения: ${values.returnDate}`,
          values.comment.trim() ? `Комментарий: ${values.comment.trim()}` : "",
        ]
          .filter(Boolean)
          .join("\n")
    const result = await submitLead({
      type: "rentbus",
      name: values.name.trim(),
      phone: values.phone,
      email: compact ? undefined : values.email.trim(),
      tour: busTitle,
      message,
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
    <SiteModalShell
      open={open}
      onClose={onClose}
      title="Заказать аренду автобуса"
      titleId="modal-bus-order-title"
      maxWidthClass="max-w-[684px]"
    >
      {status === "sent" ? (
        <ModalSuccess title="Заявка отправлена!" text="Мы свяжемся с вами в ближайшее время." />
      ) : (
        <form className={modalFormClass} onSubmit={handleSubmit} noValidate>
          {busTitle ? (
            <div className="rounded-md border border-line bg-cream/80 px-3 py-2">
              <p className="text-xs text-ink-muted">Автобус</p>
              <p className="truncate text-sm font-medium text-ink" title={busTitle}>
                {busTitle}
              </p>
            </div>
          ) : null}

          <ModalField label="Ф.И.О:" required error={errors.name}>
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

          {/* Desktop-only trip details; mobile sends busTitle via lead.tour */}
          <div className="hidden space-y-3 sm:block" data-bus-order-extended>
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

            <div className="grid gap-3 sm:grid-cols-2">
              <ModalField label="Откуда:" required error={errors.from}>
                <input value={values.from} onChange={(e) => set("from", e.target.value)} className={modalInputClass(!!errors.from)} />
              </ModalField>
              <ModalField label="Куда:" required error={errors.to}>
                <input value={values.to} onChange={(e) => set("to", e.target.value)} className={modalInputClass(!!errors.to)} />
              </ModalField>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <ModalField label="Количество пассажиров:" required error={errors.passengers}>
                <input
                  type="number"
                  min={1}
                  inputMode="numeric"
                  value={values.passengers}
                  onChange={(e) => set("passengers", e.target.value)}
                  className={modalInputClass(!!errors.passengers)}
                />
              </ModalField>
              <ModalField label="Форма оплаты:" required>
                <select value={values.payment} onChange={(e) => set("payment", e.target.value)} className={modalInputClass()}>
                  <option>Безналичный расчет</option>
                  <option>Наличный расчет</option>
                </select>
              </ModalField>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <ModalField label="Дата отправления:" required error={errors.departure}>
                <input type="date" value={values.departure} onChange={(e) => set("departure", e.target.value)} className={modalInputClass(!!errors.departure)} />
              </ModalField>
              <ModalField label="Дата возвращения:" required error={errors.returnDate}>
                <input type="date" value={values.returnDate} onChange={(e) => set("returnDate", e.target.value)} className={modalInputClass(!!errors.returnDate)} />
              </ModalField>
            </div>

            <ModalField label="Комментарий к заявке:">
              <textarea
                value={values.comment}
                onChange={(e) => set("comment", e.target.value)}
                rows={2}
                className={modalTextareaClass}
              />
            </ModalField>
          </div>

          <ModalDivider />
          <ModalCaptchaRow
            resetKey={open}
            action="rentbus"
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
