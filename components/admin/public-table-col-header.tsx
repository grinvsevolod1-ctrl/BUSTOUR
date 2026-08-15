"use client"

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Columns3, Settings2 } from "lucide-react"
import { Input, Label, Select } from "@/components/admin/ui"
import type { PublicColWidth, PublicColWidthMode } from "@/lib/public-table-col-widths"
import { cn } from "@/lib/utils"

const MODE_LABELS: Record<PublicColWidthMode, string> = {
  hug: "Hug — по содержимому",
  fill: "Fill — растянуть",
  fixed: "Fixed — фиксированная",
}

const MENU_WIDTH_PX = 256
const MENU_EST_HEIGHT_PX = 300
const VIEWPORT_PAD = 8

function parsePx(raw: string): number | undefined {
  const t = raw.trim()
  if (!t) return undefined
  const n = Number(t)
  if (!Number.isFinite(n) || n < 0) return undefined
  return Math.min(Math.round(n), 2000)
}

function menuCoordsFromButton(btn: HTMLElement): { top: number; left: number } {
  const rect = btn.getBoundingClientRect()
  let left = rect.left
  let top = rect.bottom + 4
  left = Math.min(left, window.innerWidth - MENU_WIDTH_PX - VIEWPORT_PAD)
  left = Math.max(VIEWPORT_PAD, left)
  if (top + MENU_EST_HEIGHT_PX > window.innerHeight - VIEWPORT_PAD) {
    const above = rect.top - MENU_EST_HEIGHT_PX - 4
    if (above >= VIEWPORT_PAD) top = above
  }
  return { top, left }
}

/** Column header with a menu to configure public (site) table width. */
export function PublicTableColHeader({
  label,
  value,
  onChange,
  className,
  description,
  hideLabel = false,
}: {
  label: string
  value: PublicColWidth
  onChange: (next: PublicColWidth) => void
  className?: string
  description?: string
  hideLabel?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const menuId = useId()

  useEffect(() => setMounted(true), [])

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return
    setCoords(menuCoordsFromButton(buttonRef.current))
  }, [open])

  useEffect(() => {
    if (!open) return
    function reposition() {
      if (!buttonRef.current) return
      setCoords(menuCoordsFromButton(buttonRef.current))
    }
    function onDoc(e: MouseEvent) {
      const t = e.target as Node
      if (buttonRef.current?.contains(t) || menuRef.current?.contains(t)) return
      setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }
    window.addEventListener("resize", reposition)
    // capture scroll from overflow:auto table wrappers
    window.addEventListener("scroll", reposition, true)
    document.addEventListener("mousedown", onDoc)
    document.addEventListener("keydown", onKey)
    return () => {
      window.removeEventListener("resize", reposition)
      window.removeEventListener("scroll", reposition, true)
      document.removeEventListener("mousedown", onDoc)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  const menu =
    open && coords && mounted
      ? createPortal(
          <div
            ref={menuRef}
            id={menuId}
            role="dialog"
            aria-label={`Настройки ширины: ${label}`}
            className="fixed z-50 w-64 rounded-lg border border-admin-border bg-white p-3 shadow-lg"
            style={{ top: coords.top, left: coords.left }}
          >
            <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-admin-fg">
              <Columns3 className="h-3.5 w-3.5" aria-hidden />
              Ширина на сайте
            </div>

            <Label htmlFor={`${menuId}-mode`} className="mb-1">
              Режим
            </Label>
            <Select
              id={`${menuId}-mode`}
              className="mb-3 h-8 py-1 text-xs"
              value={value.mode}
              onChange={(e) => {
                const mode = e.target.value as PublicColWidthMode
                const next: PublicColWidth = { mode }
                if (mode === "fixed") {
                  // Migrate existing minPx → widthPx if user had only min set.
                  if (value.widthPx != null) next.widthPx = value.widthPx
                  else if (value.minPx != null) next.widthPx = value.minPx
                } else if (mode === "hug") {
                  if (value.minPx != null) next.minPx = value.minPx
                } else {
                  // fill — preserve min/max, drop widthPx.
                  if (value.minPx != null) next.minPx = value.minPx
                  if (value.maxPx != null) next.maxPx = value.maxPx
                }
                onChange(next)
              }}
            >
              {(Object.keys(MODE_LABELS) as PublicColWidthMode[]).map((mode) => (
                <option key={mode} value={mode}>
                  {MODE_LABELS[mode]}
                </option>
              ))}
            </Select>

            {value.mode === "fixed" ? (
              <div>
                <Label htmlFor={`${menuId}-width`} className="mb-1">
                  Ширина, px
                </Label>
                <Input
                  id={`${menuId}-width`}
                  type="number"
                  min={0}
                  max={2000}
                  className="h-8 py-1 text-xs"
                  value={value.widthPx ?? ""}
                  placeholder="120"
                  onChange={(e) =>
                    onChange({
                      ...value,
                      widthPx: parsePx(e.target.value),
                    })
                  }
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor={`${menuId}-min`} className="mb-1">
                    Min, px
                  </Label>
                  <Input
                    id={`${menuId}-min`}
                    type="number"
                    min={0}
                    max={2000}
                    className="h-8 py-1 text-xs"
                    value={value.minPx ?? ""}
                    placeholder="—"
                    onChange={(e) =>
                      onChange({
                        ...value,
                        minPx: parsePx(e.target.value),
                      })
                    }
                  />
                </div>
                {value.mode !== "hug" ? (
                  <div>
                    <Label htmlFor={`${menuId}-max`} className="mb-1">
                      Max, px
                    </Label>
                    <Input
                      id={`${menuId}-max`}
                      type="number"
                      min={0}
                      max={2000}
                      className="h-8 py-1 text-xs"
                      value={value.maxPx ?? ""}
                      placeholder="—"
                      onChange={(e) =>
                        onChange({
                          ...value,
                          maxPx: parsePx(e.target.value),
                        })
                      }
                    />
                  </div>
                ) : null}
              </div>
            )}

            <p className="mt-2 text-[11px] leading-snug text-admin-fg-muted">
              {description ?? "Меняет таблицу на публичной странице трансфера, не таблицу редактора."}
            </p>
          </div>,
          document.body,
        )
      : null

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {hideLabel ? null : <span className="min-w-0 flex-1 truncate">{label}</span>}
      <button
        ref={buttonRef}
        type="button"
        className={cn(
          "inline-flex h-9 w-9 min-h-9 min-w-9 shrink-0 items-center justify-center rounded-md border border-transparent text-admin-fg-muted transition-colors",
          "hover:border-admin-border hover:bg-admin-muted hover:text-admin-fg",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-ring",
          open && "border-admin-border bg-admin-muted text-admin-fg",
        )}
        aria-label={`Ширина колонки «${label}» на сайте`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
      >
        <Settings2 className="h-3.5 w-3.5" aria-hidden />
      </button>
      {menu}
    </div>
  )
}
