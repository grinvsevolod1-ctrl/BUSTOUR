"use client"

import { Headphones } from "lucide-react"
import { useCallbackModal } from "./callback-modal"

export function CallUs({
  title,
  subtitle,
  button,
}: {
  title: string
  subtitle: string
  button: string
}) {
  const { open } = useCallbackModal()

  return (
    <div className="flex flex-col items-start justify-between gap-4 rounded-xl bg-line p-6 sm:flex-row sm:items-center">
      <div className="flex items-center gap-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white text-cyan-accent">
          <Headphones className="h-6 w-6" strokeWidth={1.75} aria-hidden />
        </span>
        <div className="flex flex-col gap-1">
          <span className="text-lg font-semibold text-ink">{title}</span>
          <span className="text-base text-ink-muted">{subtitle}</span>
        </div>
      </div>
      <button
        type="button"
        onClick={open}
        className="h-12 shrink-0 rounded-lg border border-ink px-6 text-base font-semibold text-ink transition-colors hover:bg-white"
      >
        {button}
      </button>
    </div>
  )
}
