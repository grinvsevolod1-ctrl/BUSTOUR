"use client"

import { useEffect, useRef, useState } from "react"
import { AlertTriangle, X } from "lucide-react"
import { toast } from "sonner"
import { IconButton } from "@/components/admin/ui"
import { cn } from "@/lib/utils"

const SLOW_THRESHOLD_MS = 2500
const SLOW_SAMPLE_COUNT = 3
const RECENT_WINDOW_MS = 60_000
const DISMISS_COOLDOWN_MS = 10 * 60 * 1000

type Timing = { at: number; duration: number }

export function SlowHostBanner() {
  const [visible, setVisible] = useState(false)
  const timingsRef = useRef<Timing[]>([])
  const dismissedUntilRef = useRef<number>(0)
  const warnedToastRef = useRef<number>(0)
  const installedRef = useRef(false)

  useEffect(() => {
    if (installedRef.current) return
    installedRef.current = true

    const originalFetch = window.fetch.bind(window)
    if (typeof originalFetch !== "function") return

    const isOurOrigin = (input: unknown): boolean => {
      try {
        let url: string | undefined
        if (typeof input === "string") url = input
        else if (input instanceof URL) url = input.href
        else if (input && typeof input === "object" && "url" in input) {
          url = String((input as Request).url || "")
        }
        if (!url) return false
        if (url.startsWith("/")) return true
        if (typeof window !== "undefined" && url.startsWith(window.location.origin)) return true
        return false
      } catch {
        return false
      }
    }

    window.fetch = (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const our = isOurOrigin(input)
      const t0 = performance.now()
      try {
        return await originalFetch(input as RequestInfo | URL, init)
      } finally {
        if (our) {
          const duration = performance.now() - t0
          const now = Date.now()
          timingsRef.current = [
            ...timingsRef.current.filter((t) => now - t.at <= RECENT_WINDOW_MS),
            { at: now, duration },
          ].slice(-16)

          const recent = timingsRef.current.slice(-8)
          const slowCount = recent.filter((t) => t.duration >= SLOW_THRESHOLD_MS).length

          if (slowCount >= SLOW_SAMPLE_COUNT && now > dismissedUntilRef.current) {
            if (now - warnedToastRef.current > 60_000) {
              warnedToastRef.current = now
              toast.warning("Сервер отвечает медленно", {
                description: "Запросы выполняются дольше обычного — это может быть временная проблема хостинга.",
                id: "slow-host-toast",
              })
            }
            setVisible(true)
          }
        }
      }
    }) as typeof window.fetch

    return () => {
      window.fetch = originalFetch
      installedRef.current = false
    }
  }, [])

  if (!visible) return null

  return (
    <div
      role="alert"
      className={cn(
        "sticky top-0 z-50 mx-auto w-full max-w-[1600px]",
        "border-b border-amber-200 bg-amber-50 px-4 py-2 text-amber-800 shadow-sm md:px-6",
      )}
    >
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-amber-900">Сервер отвечает медленно</p>
          <p className="text-xs text-amber-700/90">
            Последние запросы выполнялись дольше обычного. Возможно, это временная нестабильность
            хостинга — повторите действие позже, если сохранение или загрузка не удались.
          </p>
        </div>
        <IconButton
          type="button"
          aria-label="Скрыть уведомление"
          onClick={() => {
            setVisible(false)
            dismissedUntilRef.current = Date.now() + DISMISS_COOLDOWN_MS
          }}
          className="h-8 w-8"
        >
          <X className="h-4 w-4" />
        </IconButton>
      </div>
    </div>
  )
}
