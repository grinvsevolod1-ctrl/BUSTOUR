"use client"

import { useState, useTransition } from "react"
import { ChevronDown, Eye, EyeOff, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { saveSettingsAction } from "@/app/admin/cms-actions"
import { savePageSectionsOrderAction } from "@/app/admin/cms-actions"

/**
 * PageSectionCard — wraps a page section editor block.
 *
 * Header: label + Eye/EyeOff toggle + Delete button.
 * - Eye: show/hide section on public page (persists "egipet.section.key" = "0"/"1")
 * - Delete: removes section from the active order (calls onDelete callback so
 *   the parent PageSectionsManager can update its order state)
 * - id: anchor for sidebar navigation scroll
 */
export function PageSectionCard({
  sectionId,
  settingKey,
  label,
  defaultVisible,
  children,
  toggleKeys,
  onDelete,
}: {
  /** Short key like "why", used for anchor id */
  sectionId: string
  /** settings key controlling visibility, e.g. "egipet.section.why" */
  settingKey: string
  label: string
  /** current value from DB ("1" = visible, "0" = hidden) */
  defaultVisible: boolean
  children: React.ReactNode
  /** comma-separated list of ALL toggle keys on this page — needed by saveSettingsAction */
  toggleKeys: string
  /** Called when admin clicks Delete — parent should remove from order state */
  onDelete: () => void
}) {
  const [visible, setVisible] = useState(defaultVisible)
  const [collapsed, setCollapsed] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [pending, startTransition] = useTransition()

  function toggle() {
    const next = !visible
    setVisible(next)
    startTransition(async () => {
      const fd = new FormData()
      // Only this key — do not list sibling section keys in __toggles (that zeros them).
      fd.set(settingKey, next ? "1" : "0")
      await saveSettingsAction(null, fd)
    })
  }

  return (
    <div
      id={`sec-${sectionId}`}
      className={cn(
        "scroll-mt-4 rounded-lg border bg-white transition-colors",
        visible ? "border-admin-border" : "border-dashed border-admin-border opacity-70",
      )}
    >
      {/* Card header */}
      <div className="flex items-center justify-between gap-3 border-b border-admin-border px-5 py-3">
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="flex min-w-0 items-center gap-2 rounded text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-ring"
          aria-expanded={!collapsed}
          aria-controls={`sec-${sectionId}-body`}
        >
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-admin-fg-subtle transition-transform duration-150",
              collapsed ? "-rotate-90" : "rotate-0",
            )}
            aria-hidden
          />
          <span className={cn(
            "truncate text-sm font-semibold",
            visible ? "text-admin-fg" : "text-admin-fg-muted",
          )}>
            {label}
          </span>
        </button>

        <div className="flex items-center gap-2">
          {/* Eye toggle */}
          <button
            type="button"
            onClick={toggle}
            disabled={pending}
            title={visible ? "Скрыть секцию на сайте" : "Показать секцию на сайте"}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-40",
              visible
                ? "border border-admin-border text-admin-fg-muted hover:bg-amber-50 hover:border-amber-200 hover:text-amber-700"
                : "border border-admin-border bg-admin-muted text-admin-fg-muted hover:bg-green-50 hover:border-green-200 hover:text-green-700",
            )}
          >
            {visible ? (
              <><EyeOff className="h-3.5 w-3.5" /> Скрыть</>
            ) : (
              <><Eye className="h-3.5 w-3.5" /> Показать</>
            )}
          </button>

          {/* Delete */}
          {!confirmDelete ? (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              disabled={pending}
              title="Удалить секцию"
              className="inline-flex items-center gap-1.5 rounded-md border border-admin-border px-2.5 py-1 text-xs font-medium text-admin-fg-muted transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Удалить
            </button>
          ) : (
            <div className="flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-2.5 py-1">
              <span className="text-xs text-red-700">Удалить?</span>
              <button
                type="button"
                onClick={() => { setConfirmDelete(false); onDelete() }}
                className="text-xs font-semibold text-red-600 hover:underline"
              >
                Да
              </button>
              <span className="text-xs text-red-300">/</span>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="text-xs text-red-500 hover:underline"
              >
                Нет
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      {!collapsed ? (
        visible ? (
          <div id={`sec-${sectionId}-body`} className="p-5">{children}</div>
        ) : (
          <div id={`sec-${sectionId}-body`} className="px-5 py-3 text-xs italic text-admin-fg-muted">
            Секция скрыта на сайте. Нажмите «Показать», чтобы включить её обратно.
          </div>
        )
      ) : null}
    </div>
  )
}
