"use client"

import { useState, useTransition } from "react"
import { Plus, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { saveSettingsAction } from "@/app/admin/cms-actions"
import type { PageSection } from "@/lib/admin-config"

/**
 * Mini mockup thumbnails for each section type.
 * These are tiny SVG-based wireframe sketches that give a visual hint of what
 * each section looks like on the public page.
 */
const SECTION_MOCKUPS: Record<string, React.ReactNode> = {
  "egipet.section.why": (
    <svg viewBox="0 0 120 70" className="w-full" aria-hidden>
      {/* Title bar */}
      <rect x="8" y="6" width="60" height="5" rx="2" fill="currentColor" opacity="0.5" />
      <rect x="8" y="6" width="20" height="5" rx="2" fill="currentColor" opacity="0.8" />
      {/* Body text lines */}
      <rect x="8" y="16" width="104" height="3" rx="1" fill="currentColor" opacity="0.2" />
      <rect x="8" y="22" width="88" height="3" rx="1" fill="currentColor" opacity="0.2" />
      {/* Bullet list */}
      {[30, 37, 44, 51].map((y) => (
        <g key={y}>
          <circle cx="11" cy={y + 1.5} r="2" fill="currentColor" opacity="0.5" />
          <rect x="16" y={y} width="72" height="3" rx="1" fill="currentColor" opacity="0.2" />
        </g>
      ))}
      {/* Image strip */}
      <rect x="8" y="60" width="104" height="6" rx="2" fill="currentColor" opacity="0.15" />
    </svg>
  ),

  "egipet.section.resorts": (
    <svg viewBox="0 0 120 70" className="w-full" aria-hidden>
      <rect x="8" y="6" width="55" height="5" rx="2" fill="currentColor" opacity="0.5" />
      <rect x="8" y="6" width="20" height="5" rx="2" fill="currentColor" opacity="0.8" />
      <rect x="8" y="16" width="104" height="3" rx="1" fill="currentColor" opacity="0.2" />
      <rect x="8" y="22" width="90" height="3" rx="1" fill="currentColor" opacity="0.2" />
      <rect x="8" y="28" width="96" height="3" rx="1" fill="currentColor" opacity="0.2" />
      <rect x="8" y="34" width="80" height="3" rx="1" fill="currentColor" opacity="0.2" />
      {/* Two photo boxes */}
      <rect x="8" y="44" width="50" height="22" rx="2" fill="currentColor" opacity="0.12" />
      <rect x="62" y="44" width="50" height="22" rx="2" fill="currentColor" opacity="0.12" />
    </svg>
  ),

  "egipet.section.when": (
    <svg viewBox="0 0 120 70" className="w-full" aria-hidden>
      <rect x="8" y="6" width="50" height="5" rx="2" fill="currentColor" opacity="0.5" />
      <rect x="8" y="6" width="18" height="5" rx="2" fill="currentColor" opacity="0.8" />
      <rect x="8" y="16" width="104" height="3" rx="1" fill="currentColor" opacity="0.2" />
      <rect x="8" y="22" width="96" height="3" rx="1" fill="currentColor" opacity="0.2" />
      <rect x="8" y="28" width="60" height="3" rx="1" fill="currentColor" opacity="0.2" />
    </svg>
  ),

  "egipet.section.included": (
    <svg viewBox="0 0 120 70" className="w-full" aria-hidden>
      <rect x="8" y="6" width="58" height="5" rx="2" fill="currentColor" opacity="0.5" />
      <rect x="8" y="6" width="22" height="5" rx="2" fill="currentColor" opacity="0.8" />
      <rect x="8" y="16" width="90" height="3" rx="1" fill="currentColor" opacity="0.2" />
      {[24, 31, 38, 45, 52, 59].map((y) => (
        <g key={y}>
          <circle cx="11" cy={y + 1.5} r="2" fill="currentColor" opacity="0.5" />
          <rect x="16" y={y} width="68" height="3" rx="1" fill="currentColor" opacity="0.2" />
        </g>
      ))}
    </svg>
  ),

  "egipet.section.how": (
    <svg viewBox="0 0 120 70" className="w-full" aria-hidden>
      <rect x="8" y="6" width="44" height="5" rx="2" fill="currentColor" opacity="0.5" />
      <rect x="8" y="6" width="16" height="5" rx="2" fill="currentColor" opacity="0.8" />
      <rect x="8" y="16" width="104" height="3" rx="1" fill="currentColor" opacity="0.2" />
      <rect x="8" y="22" width="88" height="3" rx="1" fill="currentColor" opacity="0.2" />
      <rect x="8" y="28" width="72" height="3" rx="1" fill="currentColor" opacity="0.2" />
    </svg>
  ),

  "egipet.section.cities": (
    <svg viewBox="0 0 120 70" className="w-full" aria-hidden>
      <rect x="8" y="6" width="52" height="5" rx="2" fill="currentColor" opacity="0.5" />
      <rect x="8" y="6" width="20" height="5" rx="2" fill="currentColor" opacity="0.8" />
      {/* Grid of city cards */}
      {[
        [8, 16], [44, 16], [80, 16],
        [8, 34], [44, 34], [80, 34],
      ].map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width="32" height="14" rx="2" fill="currentColor" opacity="0.15" />
      ))}
    </svg>
  ),

  "egipet.section.compare": (
    <svg viewBox="0 0 120 70" className="w-full" aria-hidden>
      <rect x="8" y="6" width="56" height="5" rx="2" fill="currentColor" opacity="0.5" />
      <rect x="8" y="6" width="22" height="5" rx="2" fill="currentColor" opacity="0.8" />
      {/* Table header */}
      <rect x="8" y="16" width="104" height="8" rx="2" fill="currentColor" opacity="0.35" />
      {/* Table rows */}
      {[28, 39, 50, 61].map((y) => (
        <rect key={y} x="8" y={y} width="104" height="8" rx="1" fill="currentColor" opacity={y % 2 === 0 ? 0.1 : 0.05} />
      ))}
    </svg>
  ),

  "egipet.section.season": (
    <svg viewBox="0 0 120 70" className="w-full" aria-hidden>
      <rect x="8" y="6" width="48" height="5" rx="2" fill="currentColor" opacity="0.5" />
      <rect x="8" y="6" width="18" height="5" rx="2" fill="currentColor" opacity="0.8" />
      <rect x="8" y="16" width="104" height="3" rx="1" fill="currentColor" opacity="0.2" />
      <rect x="8" y="22" width="96" height="3" rx="1" fill="currentColor" opacity="0.2" />
      <rect x="8" y="28" width="76" height="3" rx="1" fill="currentColor" opacity="0.2" />
      <rect x="8" y="38" width="104" height="3" rx="1" fill="currentColor" opacity="0.2" />
      <rect x="8" y="44" width="88" height="3" rx="1" fill="currentColor" opacity="0.2" />
    </svg>
  ),
}

function defaultMockup(label: string) {
  return (
    <svg viewBox="0 0 120 70" className="w-full" aria-hidden>
      <rect x="8" y="6" width="50" height="5" rx="2" fill="currentColor" opacity="0.5" />
      <rect x="8" y="16" width="104" height="3" rx="1" fill="currentColor" opacity="0.2" />
      <rect x="8" y="22" width="88" height="3" rx="1" fill="currentColor" opacity="0.2" />
      <rect x="8" y="28" width="72" height="3" rx="1" fill="currentColor" opacity="0.2" />
      <text x="8" y="60" fontSize="8" fill="currentColor" opacity="0.4">{label}</text>
    </svg>
  )
}

/**
 * SectionsPicker — shown when the page has hidden sections.
 *
 * Displays a button "Добавить секцию" which opens a modal-like panel
 * showing all hidden sections as mini mockup cards. Clicking one
 * immediately makes it visible (persists via saveSettingsAction).
 */
export function SectionsPicker({
  sections,
  settings,
  toggleKeys,
}: {
  sections: PageSection[]
  settings: Record<string, string>
  toggleKeys: string
}) {
  const hidden = sections.filter((s) => (settings[s.key] ?? "1") === "0")
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  if (hidden.length === 0) return null

  function show(key: string) {
    startTransition(async () => {
      const fd = new FormData()
      fd.set(key, "1")
      await saveSettingsAction(null, fd)
    })
    // Optimistically close after click
    setTimeout(() => setOpen(false), 200)
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-lg border border-dashed border-admin-border px-4 py-3 text-sm text-admin-fg-muted transition-colors hover:border-admin-fg/40 hover:text-admin-fg w-full justify-center"
      >
        <Plus className="h-4 w-4" />
        Добавить секцию
        <span className="ml-1 rounded-full bg-admin-muted px-1.5 py-0.5 text-xs font-medium text-admin-fg-muted">
          {hidden.length}
        </span>
      </button>

      {open && (
        <div className="mt-2 rounded-lg border border-admin-border bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-admin-border px-4 py-3">
            <span className="text-sm font-semibold text-admin-fg">Скрытые секции — нажмите, чтобы добавить</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="grid h-7 w-7 place-items-center rounded text-admin-fg-muted hover:bg-admin-muted hover:text-admin-fg"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 md:grid-cols-4">
            {hidden.map((sec) => (
              <button
                key={sec.key}
                type="button"
                disabled={pending}
                onClick={() => show(sec.key)}
                className={cn(
                  "group flex flex-col gap-2 rounded-lg border border-admin-border p-3 text-left transition-colors hover:border-brand hover:bg-brand/5 disabled:opacity-50",
                )}
              >
                {/* Mini mockup */}
                <div className="rounded bg-admin-muted/60 p-2 text-admin-fg-muted group-hover:text-brand">
                  {SECTION_MOCKUPS[sec.key] ?? defaultMockup(sec.label)}
                </div>
                <span className="text-xs font-medium text-admin-fg leading-snug">{sec.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
