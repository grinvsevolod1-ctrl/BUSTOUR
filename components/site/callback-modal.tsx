"use client"

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { Phone, X } from "lucide-react"
import { LeadForm } from "./lead-form"
import {
  modalBackdropTransition,
  modalPanelTransition,
  motionWillChangeOpacityTransform,
} from "@/components/site/motion-presets"
import { CaptchaUiProvider } from "@/components/site/modals/site-modal-shell"
import { isCaptchaStatusVisible } from "@/lib/recaptcha-public"
import { getOfficeHoursLabel, getPrimaryPhone } from "@/lib/contact-settings"

type CallbackContextValue = { open: () => void }

const CallbackContext = createContext<CallbackContextValue | null>(null)

export function useCallbackModal() {
  const ctx = useContext(CallbackContext)
  if (!ctx) throw new Error("useCallbackModal must be used within CallbackProvider")
  return ctx
}

export function CallbackProvider({
  children,
  settings,
  captchaStatusAllowed = false,
}: {
  children: React.ReactNode
  settings?: Record<string, string>
  /** DEV stand only — CMS toggle is ignored on production/local. */
  captchaStatusAllowed?: boolean
}) {
  const statusVisible = captchaStatusAllowed && isCaptchaStatusVisible(settings)
  const hours = getOfficeHoursLabel(settings ?? {})
  const phone = getPrimaryPhone(settings ?? {})
  const [isOpen, setIsOpen] = useState(false)
  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close()
    }
    document.addEventListener("keydown", onKey)
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = ""
    }
  }, [isOpen, close])

  useEffect(() => {
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current)
    }
  }, [])

  const scheduleClose = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    closeTimer.current = setTimeout(close, 2500)
  }, [close])

  return (
    <CaptchaUiProvider statusVisible={statusVisible}>
    <CallbackContext.Provider value={{ open }}>
      {children}

      <motion.button
        type="button"
        onClick={open}
        aria-label="Заказать звонок"
        className="fixed bottom-5 right-5 z-40 grid h-14 w-14 place-items-center rounded-full bg-brand text-brand-foreground shadow-lg md:hidden"
        whileHover={reduceMotion ? undefined : { scale: 1.05 }}
        whileTap={reduceMotion ? undefined : { scale: 0.95 }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
      >
        <Phone className="h-6 w-6" strokeWidth={2} />
      </motion.button>

      <AnimatePresence>
        {isOpen ? (
          <motion.div
            key="callback-modal"
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
              onClick={close}
              className="absolute inset-0 bg-black/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={reduceMotion ? { duration: 0 } : modalBackdropTransition}
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="callback-title"
              className="relative z-10 flex min-h-0 w-full max-w-md flex-col overflow-hidden rounded-t-xl bg-white shadow-xl overscroll-contain max-h-[calc(100dvh-1.5rem-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px))] sm:rounded-xl"
              style={motionWillChangeOpacityTransform}
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reduceMotion ? undefined : { opacity: 0 }}
              transition={reduceMotion ? { duration: 0 } : modalPanelTransition}
            >
              <div className="flex shrink-0 items-start justify-between gap-2 border-b border-line px-4 py-3">
                <div className="min-w-0">
                  <h2 id="callback-title" className="text-pretty text-base font-semibold text-ink sm:text-lg">
                    Заказать звонок
                  </h2>
                  <p className="mt-0.5 text-sm text-ink-muted">
                    Оставьте контакты — перезвоним в рабочее время ({hours}).
                  </p>
                  {phone ? (
                    <p className="mt-2 text-sm text-ink">
                      Или позвоните:{" "}
                      <a
                        href={phone.href}
                        className="inline-flex min-h-11 items-center font-semibold text-cyan-accent underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30"
                      >
                        {phone.label}
                      </a>
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={close}
                  aria-label="Закрыть"
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-md text-ink-muted touch-manipulation hover:bg-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30"
                >
                  <X className="h-5 w-5" aria-hidden />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-4">
                <LeadForm
                  type="callback"
                  submitLabel="Жду звонка"
                  successTitle="Спасибо!"
                  successText="Мы перезвоним вам в ближайшее время."
                  onSuccess={scheduleClose}
                />
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </CallbackContext.Provider>
    </CaptchaUiProvider>
  )
}
