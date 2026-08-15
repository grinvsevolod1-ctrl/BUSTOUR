"use client"

import { useRef, useState } from "react"
import { Paperclip, Trash2 } from "lucide-react"
import { formatPhoneIfComplete, isSupportedPhone, sanitizePhoneTyping, validateLead } from "@/lib/lead"
import { submitPublicReview } from "@/lib/public-review"
import { stripReviewLinks } from "@/lib/review-utils"
import { captchaRequiredClientError } from "@/lib/recaptcha-public"
import { MAX_MEDIA_SIZE_BYTES, validateMediaMeta } from "@/lib/media-utils"
import {
  ModalCaptchaRow,
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

function RatingStars({
  value,
  onChange,
}: {
  value: number
  onChange: (n: number) => void
}) {
  return (
    <div className="flex gap-1" role="radiogroup" aria-label="Оценка">
      {Array.from({ length: 5 }, (_, i) => {
        const n = i + 1
        const filled = n <= value
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} из 5`}
            onClick={() => onChange(n)}
            className="grid h-10 w-10 place-items-center rounded-md touch-manipulation hover:bg-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
          >
            <svg width="22" height="22" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path
                d="M8 1.5l1.647 3.337L13.5 5.44l-2.75 2.68.649 3.78L8 10.1l-3.399 1.8.649-3.78L2.5 5.44l3.853-.603L8 1.5z"
                fill={filled ? "#F0B336" : "none"}
                stroke="#F0B336"
                strokeWidth="1.2"
              />
            </svg>
          </button>
        )
      })}
    </div>
  )
}

export function ModalTestimonial({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
  /** @deprecated tour binding is admin-only (#63) */
  countries?: string[]
}) {
  const scheduleClose = useScheduleModalClose(onClose)
  const fileRef = useRef<HTMLInputElement>(null)
  const [values, setValues] = useState({
    name: "",
    phone: "",
    text: "",
    captcha: "",
  })
  const [rating, setRating] = useState(5)
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [consent, setConsent] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle")

  function set(field: keyof typeof values, value: string) {
    setValues((v) => ({ ...v, [field]: value }))
    if (errors[field]) setErrors((e) => ({ ...e, [field]: "" }))
  }

  function onPickFile(next: File | null) {
    if (next) {
      const validation = validateMediaMeta(next.name, next.type, next.size, MAX_MEDIA_SIZE_BYTES)
      if (!validation.type || !["image", "video"].includes(validation.type)) {
        setErrors((current) => ({ ...current, media: validation.error ?? "Можно прикрепить только фото или видео." }))
        return
      }
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setFile(next)
    setPreviewUrl(next ? URL.createObjectURL(next) : null)
    if (errors.media) setErrors((e) => ({ ...e, media: "" }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const name = stripReviewLinks(values.name)
    const text = stripReviewLinks(values.text)
    const next: Record<string, string> = {}
    if (name.length < 2) next.name = "Укажите имя"
    const phoneErr = validateLead({ name: "ok", phone: values.phone, type: "contact" }).phone
    if (phoneErr) next.phone = phoneErr
    if (!text) next.text = "Добавьте текст отзыва"
    if (!consent) next.consent = "Нужно согласие на обработку персональных данных"
    const captchaErr = captchaRequiredClientError(values.captcha)
    if (captchaErr) next.captcha = captchaErr
    if (Object.keys(next).length) {
      setErrors(next)
      return
    }

    setStatus("sending")
    const result = await submitPublicReview({
      name,
      phone: values.phone.trim(),
      text,
      rating,
      consent: true,
      captchaToken: values.captcha || undefined,
      file,
    })
    if (result.ok) {
      setStatus("sent")
      scheduleClose()
    } else {
      setStatus("idle")
      setErrors(result.errors)
    }
  }

  const isVideo = Boolean(file?.type.startsWith("video/"))

  return (
    <SiteModalShell open={open} onClose={onClose} title="Оставить отзыв" titleId="modal-testimonial-title">
      {status === "sent" ? (
        <ModalSuccess title="Спасибо за отзыв!" text="После проверки менеджером он появится на сайте." />
      ) : (
        <form className={modalFormClass} onSubmit={handleSubmit} noValidate>
          <p className="text-xs leading-4 text-ink-muted">
            <span className="text-price">*</span> — обязательные поля
          </p>
          <ModalField label="Имя:" required error={errors.name}>
            <input
              name="name"
              autoComplete="name"
              value={values.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Иванов Иван…"
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
              placeholder="+375 / +7 …"
              className={modalInputClass(!!errors.phone)}
              aria-invalid={!!errors.phone}
            />
          </ModalField>
          <ModalField label="Оценка:" required>
            <RatingStars value={rating} onChange={setRating} />
          </ModalField>
          <ModalField label="Текст отзыва:" required error={errors.text}>
            <textarea
              value={values.text}
              onChange={(e) => set("text", e.target.value)}
              rows={3}
              className={modalTextareaClass}
              aria-invalid={!!errors.text}
            />
          </ModalField>

          {previewUrl ? (
            <div className="flex items-center gap-3">
              <div className="h-16 w-24 shrink-0 overflow-hidden rounded bg-cream">
                {isVideo ? (
                  <video src={previewUrl} className="h-full w-full object-cover" muted playsInline />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewUrl} alt="" width={96} height={64} className="h-full w-full object-cover" />
                )}
              </div>
              <button
                type="button"
                aria-label="Удалить вложение"
                onClick={() => {
                  onPickFile(null)
                  if (fileRef.current) fileRef.current.value = ""
                }}
                className="grid h-10 w-10 place-items-center rounded-md text-ink-muted hover:bg-cream hover:text-price focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30"
              >
                <Trash2 className="h-5 w-5" aria-hidden />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex min-h-10 items-center gap-2 text-xs leading-4 text-ink hover:text-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30"
            >
              <Paperclip className="h-5 w-5 text-ink-muted" aria-hidden />
              Прикрепить фото или видео
            </button>
          )}
          {errors.media ? (
            <p className="text-xs text-price" role="alert">
              {errors.media}
            </p>
          ) : null}
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
            className="hidden"
            onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
          />

          <p className="text-xs leading-4 text-ink-muted">
            Отзыв будет опубликован на сайте после проверки модератором.
          </p>

          <ModalDivider />
          <ModalCaptchaRow
            resetKey={open}
            action="review"
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
              aria-invalid={!!errors.consent}
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
            Отправить отзыв
          </ModalSubmitButton>
        </form>
      )}
    </SiteModalShell>
  )
}
