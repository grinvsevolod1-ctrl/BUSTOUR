"use client"

import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { ChevronDown } from "lucide-react"
import {
  menuTransition,
  motionWillChangeOpacityTransform,
} from "@/components/site/motion-presets"

export function Dropdown({
  value,
  options,
  onChange,
  className = "",
  buttonClassName = "",
  valueClassName = "text-ink",
  chevronClassName = "h-5 w-5 text-ink-muted",
  menuClassName = "",
  ariaLabel,
}: {
  value: string
  options: string[]
  onChange: (value: string) => void
  className?: string
  buttonClassName?: string
  valueClassName?: string
  chevronClassName?: string
  menuClassName?: string
  ariaLabel?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [open])

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full items-center justify-between gap-2 outline-none ${buttonClassName}`}
      >
        <span className={`truncate ${valueClassName}`}>{value}</span>
        <ChevronDown
          className={`shrink-0 transition-transform ${chevronClassName} ${open ? "rotate-180" : ""}`}
        />
      </button>
      <AnimatePresence>
        {open ? (
          <motion.ul
            key="dropdown-menu"
            role="listbox"
            className={`absolute top-[calc(100%+4px)] z-20 max-h-64 min-w-[160px] overflow-auto rounded border border-line bg-white py-1 shadow-lg ${menuClassName || "left-0 w-full"}`}
            style={motionWillChangeOpacityTransform}
            initial={reduceMotion ? false : { opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -4 }}
            transition={reduceMotion ? { duration: 0 } : menuTransition}
          >
            {options.map((opt) => (
              <li key={opt} role="option" aria-selected={opt === value}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(opt)
                    setOpen(false)
                  }}
                  className={`block w-full px-3 py-2 text-left text-sm hover:bg-cream ${
                    opt === value ? "font-semibold text-cyan-accent" : "text-ink"
                  }`}
                >
                  {opt}
                </button>
              </li>
            ))}
          </motion.ul>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
