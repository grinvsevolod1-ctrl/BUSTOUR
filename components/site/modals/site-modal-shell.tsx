"use client"

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { Check, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { isRecaptchaEnabled, recaptchaSiteKey } from "@/lib/recaptcha-public"
import {
  modalBackdropTransition,
  modalPanelTransition,
  motionWillChangeOpacityTransform,
} from "@/components/site/motion-presets"

declare global {
  interface Window {
    grecaptcha?: {
      ready: (cb: () => void) => void
      execute: (siteKey: string, opts: { action: string }) => Promise<string>
    }
  }
}

let recaptchaScriptPromise: Promise<void> | null = null

function loadRecaptchaScript(siteKey: string): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve()
  if (window.grecaptcha) return Promise.resolve()
  if (recaptchaScriptPromise) return recaptchaScriptPromise
  recaptchaScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-bastur-recaptcha="1"]')
    if (existing) {
      existing.addEventListener("load", () => resolve())
      existing.addEventListener("error", () => reject(new Error("recaptcha load failed")))
      if (window.grecaptcha) resolve()
      return
    }
    const script = document.createElement("script")
    script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}`
    script.async = true
    script.defer = true
    script.dataset.basturRecaptcha = "1"
    script.onload = () => resolve()
    script.onerror = () => reject(new Error("recaptcha load failed"))
    document.head.appendChild(script)
  })
  return recaptchaScriptPromise
}

/** Shared reCAPTCHA v3 execute — used by ModalCaptchaRow (and callers that need a fresh token). */
export async function executeRecaptchaV3(action = "submit"): Promise<string> {
  const siteKey = recaptchaSiteKey()
  if (!siteKey) return ""
  await loadRecaptchaScript(siteKey)
  const g = window.grecaptcha
  if (!g) return ""
  await new Promise<void>((resolve) => g.ready(() => resolve()))
  return (await g.execute(siteKey, { action })).trim()
}

type CaptchaUiValue = { statusVisible: boolean }
const CaptchaUiContext = createContext<CaptchaUiValue>({ statusVisible: false })

export function CaptchaUiProvider({
  statusVisible = false,
  children,
}: {
  statusVisible?: boolean
  children: React.ReactNode
}) {
  return (
    <CaptchaUiContext.Provider value={{ statusVisible }}>{children}</CaptchaUiContext.Provider>
  )
}

export function useCaptchaUi(): CaptchaUiValue {
  return useContext(CaptchaUiContext)
}

/** Auto-close after success; clears timer on unmount (#34). */
export function useScheduleModalClose(onClose: () => void, delayMs = 2500) {
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current)
    }
  }, [])

  return useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    closeTimer.current = setTimeout(onClose, delayMs)
  }, [onClose, delayMs])
}

export function SiteModalShell({
  open,
  onClose,
  title,
  titleId,
  maxWidthClass = "max-w-[448px]",
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  titleId: string
  maxWidthClass?: string
  children: React.ReactNode
}) {
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = ""
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="site-modal"
          className="fixed inset-0 z-50 flex items-end justify-center overflow-hidden p-3 sm:items-center sm:p-4"
          style={{
            paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
            paddingTop: "max(0.75rem, env(safe-area-inset-top))",
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={reduceMotion ? { duration: 0 } : modalBackdropTransition}
        >
          <motion.button
            type="button"
            aria-label="Закрыть"
            onClick={onClose}
            className="absolute inset-0 bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={reduceMotion ? { duration: 0 } : modalBackdropTransition}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className={cn(
              "relative z-10 flex min-h-0 w-full flex-col overflow-hidden rounded-t-xl bg-white shadow-xl sm:rounded-xl",
              // min-h-0: flex item can shrink so tall forms scroll inside
              "max-h-[calc(100dvh-1.5rem-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px))] overscroll-contain",
              maxWidthClass,
            )}
            style={motionWillChangeOpacityTransform}
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0 }}
            transition={reduceMotion ? { duration: 0 } : modalPanelTransition}
          >
            <div className="flex shrink-0 items-center gap-2 border-b border-black/5 bg-brand px-4 py-3">
              <h2 id={titleId} className="min-w-0 flex-1 text-pretty text-base font-semibold leading-snug text-ink sm:text-lg">
                {title}
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Закрыть"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-md text-ink touch-manipulation hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30"
              >
                <X className="h-5 w-5" strokeWidth={2} aria-hidden />
              </button>
            </div>
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-4">
              {children}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

export function ModalField({
  label,
  required,
  error,
  children,
  className,
}: {
  label: string
  required?: boolean
  error?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <label className={cn("flex w-full min-w-0 flex-col items-stretch gap-1", className)}>
      <span className="text-sm leading-5 text-ink">
        {label}
        {required ? <span className="text-price"> *</span> : null}
      </span>
      {children}
      {error ? <span className="text-xs text-price" role="alert">{error}</span> : null}
    </label>
  )
}

export const modalInputClass = (invalid?: boolean, disabled?: boolean) =>
  cn(
    "w-full rounded border px-2.5 py-2 text-base leading-5 text-ink outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/30",
    disabled ? "cursor-not-allowed border-line bg-line text-ink-muted" : "border-line bg-white",
    invalid && "border-price",
  )

export function ModalCaptchaRow({
  onChange,
  error,
  resetKey,
  action = "submit",
  statusVisible: statusVisibleProp,
}: {
  onChange: (token: string) => void
  error?: string
  /** Change to re-execute (e.g. when modal opens). */
  resetKey?: string | number | boolean
  /** reCAPTCHA v3 action name */
  action?: string
  /** Override CMS / context visibility of «Капча: …» status. */
  statusVisible?: boolean
}) {
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const enabled = isRecaptchaEnabled()
  const { statusVisible: statusFromCtx } = useCaptchaUi()
  const statusVisible = statusVisibleProp ?? statusFromCtx
  const [passed, setPassed] = useState(false)

  useEffect(() => {
    if (!enabled) {
      onChangeRef.current("")
      setPassed(false)
      return
    }
    let cancelled = false
    setPassed(false)
    onChangeRef.current("")

    executeRecaptchaV3(action)
      .then((token) => {
        if (cancelled) return
        onChangeRef.current(token)
        setPassed(Boolean(token))
      })
      .catch(() => {
        if (cancelled) return
        onChangeRef.current("")
        setPassed(false)
      })

    return () => {
      cancelled = true
    }
  }, [enabled, action, resetKey])

  if (!enabled) {
    // Keys unset → skip captcha entirely (free testing). Optional status only when CMS toggle is on.
    if (!statusVisible) return null
    return (
      <p className="text-xs leading-4 text-ink-muted" aria-live="polite">
        Капча не подключена — проверка отключена
      </p>
    )
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-1.5">
      {statusVisible ? (
        <p
          className={cn("text-xs leading-4", passed ? "text-success" : "text-ink-muted")}
          aria-live="polite"
        >
          Капча: {passed ? "пройдена" : "не пройдена"}
        </p>
      ) : null}
      {error ? (
        <span className="text-xs text-price" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  )
}

export function ModalConsentNote() {
  return (
    <p className="text-xs leading-4 text-ink">
      Отправляя форму вы соглашаетесь на обработку{" "}
      <a href="/legal/privacy" className="underline underline-offset-2 hover:text-brand-dark">
        персональных данных
      </a>
    </p>
  )
}

export function ModalSubmitButton({
  children,
  pending,
  consent,
  captchaToken,
  phoneValid = true,
}: {
  children: React.ReactNode
  pending?: boolean
  consent?: boolean
  /** When reCAPTCHA enabled, submit stays disabled until a client token exists. */
  captchaToken?: string
  phoneValid?: boolean
}) {
  const captchaBlocks = isRecaptchaEnabled() && !(captchaToken || "").trim()
  return (
    <button
      type="submit"
      disabled={consent === false || pending || captchaBlocks || !phoneValid}
      className="inline-flex w-full items-center justify-center rounded bg-brand px-4 py-2.5 text-base font-medium leading-6 text-ink touch-manipulation transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30 disabled:opacity-70 sm:w-auto"
    >
      {pending ? "Отправка…" : children}
    </button>
  )
}

export function ModalDivider() {
  return <hr className="w-full border-0 border-t border-line" />
}

/** Shared compact form stack for site lead modals. */
export const modalFormClass = "flex flex-col gap-3"

export const modalTextareaClass =
  "max-h-28 min-h-[4.5rem] w-full resize-y rounded border border-line bg-white px-2.5 py-2 text-base leading-5 text-ink outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/30"

export function ModalSuccess({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-4 text-center">
      <span className="grid h-10 w-10 place-items-center rounded-full bg-success/10">
        <Check className="h-5 w-5 text-success" aria-hidden />
      </span>
      <p className="font-semibold text-ink">{title}</p>
      <p className="text-sm text-ink-muted">{text}</p>
    </div>
  )
}
