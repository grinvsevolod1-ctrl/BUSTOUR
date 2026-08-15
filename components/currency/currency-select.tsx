"use client"

import { useEffect, useId, useRef, useState } from "react"
import { Check, ChevronDown } from "lucide-react"
import { CurrencyIcon } from "@/components/currency/currency-icon"
import type { Currency } from "@/lib/types"

export type CurrencyOption = Pick<Currency, "code" | "label"> & Partial<Currency>

/**
 * Unified currency picker with vector icons — used across admin forms and the
 * public site. Works as a form field via the hidden input (`name`).
 */
export function CurrencySelect({
  value,
  onChange,
  options,
  name,
  allowEmpty = false,
  emptyLabel = "— не указана —",
  ariaLabel = "Валюта",
  size = "md",
  className = "",
}: {
  value: string
  onChange?: (code: string) => void
  options: CurrencyOption[]
  name?: string
  allowEmpty?: boolean
  emptyLabel?: string
  ariaLabel?: string
  size?: "sm" | "md"
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [internal, setInternal] = useState(value)
  const ref = useRef<HTMLDivElement>(null)
  const listboxId = useId()
  const current = onChange ? value : internal

  useEffect(() => setInternal(value), [value])

  useEffect(() => {
    if (!open) return
    const onPointer = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onPointer)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onPointer)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  function pick(code: string) {
    if (onChange) onChange(code)
    else setInternal(code)
    setOpen(false)
  }

  const selected = options.find((o) => o.code === current)
  const btnPad = size === "sm" ? "px-2 py-1 text-xs" : "px-2.5 py-1.5 text-sm"
  const iconSize = size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"

  return (
    <div ref={ref} className={`relative inline-block ${className}`}>
      {name ? <input type="hidden" name={name} value={current} /> : null}
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? listboxId : undefined}
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full items-center gap-1.5 rounded-md border border-admin-border bg-admin-card font-medium text-admin-fg transition-colors hover:bg-admin-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${btnPad}`}
      >
        {selected ? (
          <>
            <CurrencyIcon code={selected.code} className={`${iconSize} shrink-0 text-admin-fg-muted`} />
            <span className="font-semibold uppercase tabular-nums">{selected.code}</span>
          </>
        ) : (
          <span className="text-admin-fg-subtle">{allowEmpty ? emptyLabel : "—"}</span>
        )}
        <ChevronDown
          className={`ml-auto h-3.5 w-3.5 shrink-0 text-admin-fg-subtle transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open ? (
        <ul
          id={listboxId}
          role="listbox"
          aria-label={ariaLabel}
          className="absolute left-0 z-50 mt-1 min-w-full overflow-hidden rounded-md border border-admin-border bg-admin-card py-1 shadow-lg"
        >
          {allowEmpty ? (
            <li role="option" aria-selected={current === ""}>
              <button
                type="button"
                onClick={() => pick("")}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-admin-fg-subtle hover:bg-admin-muted"
              >
                {emptyLabel}
                {current === "" ? <Check className="ml-auto h-3.5 w-3.5" /> : null}
              </button>
            </li>
          ) : null}
          {options.map((option) => (
            <li key={option.code} role="option" aria-selected={option.code === current}>
              <button
                type="button"
                onClick={() => pick(option.code)}
                className="flex w-full items-center gap-2 whitespace-nowrap px-3 py-1.5 text-left text-sm text-admin-fg hover:bg-admin-muted"
              >
                <CurrencyIcon code={option.code} className="h-3.5 w-3.5 shrink-0 text-admin-fg-muted" />
                <span className="font-semibold uppercase tabular-nums">{option.code}</span>
                {option.label && option.label !== option.code ? (
                  <span className="truncate text-xs text-admin-fg-subtle">{option.label}</span>
                ) : null}
                {option.code === current ? <Check className="ml-auto h-3.5 w-3.5 shrink-0 text-blue-600" /> : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
