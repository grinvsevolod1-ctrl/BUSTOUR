"use client"

import { useEffect, useId, useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { AlertTriangle, Info, X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { AlertKind } from "@/lib/types"
import {
  modalBackdropTransition,
  modalPanelTransition,
  motionWillChangeOpacityTransform,
} from "@/components/site/motion-presets"

const STORAGE_KEY = "bastur:announcement-dismissed"

/**
 * Стабильная сигнатура сообщения: закрыв попап, посетитель не увидит его снова,
 * пока админ не изменит заголовок или текст (новая сигнатура ≠ сохранённая).
 */
function messageSignature(title: string, text: string): string {
  const raw = `${title}\u0000${text}`
  let hash = 0
  for (let i = 0; i < raw.length; i++) {
    hash = (Math.imul(31, hash) + raw.charCodeAt(i)) | 0
  }
  return String(hash)
}

export function AnnouncementPopup({
  title,
  text,
  type,
}: {
  title: string
  text: string
  type: AlertKind
}) {
  const [open, setOpen] = useState(false)
  const titleId = useId()
  const reduceMotion = useReducedMotion()
  const signature = messageSignature(title, text)

  useEffect(() => {
    try {
      if (window.localStorage.getItem(STORAGE_KEY) === signature) return
    } catch {}
    // Небольшая задержка, чтобы попап не «бил по глазам» до отрисовки страницы.
    const timer = setTimeout(() => setOpen(true), 700)
    return () => clearTimeout(timer)
  }, [signature])

  function dismiss() {
    setOpen(false)
    try {
      window.localStorage.setItem(STORAGE_KEY, signature)
    } catch {}
  }

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const isWarning = type === "warning"
  const Icon = isWarning ? AlertTriangle : Info
  const paragraphs = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="announcement-popup"
          className="fixed inset-0 z-[60] flex items-end justify-center p-3 sm:items-center sm:p-4"
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
            onClick={dismiss}
            className="absolute inset-0 bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={reduceMotion ? { duration: 0 } : modalBackdropTransition}
          />
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative z-10 w-full max-w-[480px] overflow-hidden rounded-t-xl bg-white shadow-xl sm:rounded-xl"
            style={motionWillChangeOpacityTransform}
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: 12 }}
            transition={reduceMotion ? { duration: 0 } : modalPanelTransition}
          >
            <div
              className={cn(
                "flex items-center gap-2 border-b border-black/5 px-4 py-3",
                isWarning ? "bg-amber-100" : "bg-brand",
              )}
            >
              <Icon
                className={cn("h-5 w-5 shrink-0", isWarning ? "text-amber-700" : "text-ink")}
                aria-hidden
              />
              <h2
                id={titleId}
                className="min-w-0 flex-1 text-pretty text-base font-semibold leading-snug text-ink sm:text-lg"
              >
                {title || "Важная информация"}
              </h2>
              <button
                type="button"
                onClick={dismiss}
                aria-label="Закрыть"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-md text-ink touch-manipulation hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30"
              >
                <X className="h-5 w-5" strokeWidth={2} aria-hidden />
              </button>
            </div>
            <div className="space-y-2.5 p-4 sm:p-5">
              {paragraphs.map((line, index) => (
                <p key={index} className="text-pretty text-sm leading-relaxed text-ink sm:text-base">
                  {line}
                </p>
              ))}
              <button
                type="button"
                onClick={dismiss}
                className="mt-2 inline-flex w-full items-center justify-center rounded bg-brand px-4 py-2.5 text-base font-medium leading-6 text-ink touch-manipulation transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30 sm:w-auto"
              >
                Понятно
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
