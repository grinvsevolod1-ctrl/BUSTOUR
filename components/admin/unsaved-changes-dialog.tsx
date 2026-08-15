"use client"

import { useEffect, useRef, type KeyboardEvent } from "react"

type Props = {
  open: boolean
  dirtyCount: number
  onStay(): void
  onDiscard(): void
}

const focusable = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function UnsavedChangesDialog({ open, dirtyCount, onStay, onDiscard }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const stayButtonRef = useRef<HTMLButtonElement>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    previouslyFocused.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    stayButtonRef.current?.focus()
    return () => previouslyFocused.current?.focus()
  }, [open])

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault()
      onStay()
      return
    }
    if (event.key !== "Tab") return
    const controls = [...(dialogRef.current?.querySelectorAll<HTMLElement>(focusable) ?? [])]
    if (controls.length === 0) return
    const first = controls[0]!
    const last = controls.at(-1)!
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-black/50 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onStay()
      }}>
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="unsaved-title"
        aria-describedby="unsaved-description"
        className="w-full max-w-md rounded-lg border border-admin-border bg-admin-card p-6 text-admin-fg shadow-xl"
        onKeyDown={handleKeyDown}>
        <h2 id="unsaved-title" className="text-lg font-semibold">
          Есть несохранённые изменения
        </h2>
        <p id="unsaved-description" className="mt-2 text-sm text-admin-fg-muted">
          {dirtyCount === 1
            ? "Одна область содержит несохранённые данные."
            : `Несохранённые данные есть в ${dirtyCount} областях.`}
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button ref={stayButtonRef} type="button" onClick={onStay} className="min-h-11 rounded-md border border-admin-border px-4 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
            Остаться
          </button>
          <button type="button" onClick={onDiscard} className="min-h-11 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400">
            Уйти без сохранения
          </button>
        </div>
      </div>
    </div>
  )
}
