"use client"

import { useEffect, useId, useMemo, useState, useTransition } from "react"
import { Dialog } from "@base-ui/react/dialog"
import { Search } from "lucide-react"
import { getAllShortcodesAction } from "@/app/admin/shortcode-actions"
import type { ShortcodeRow } from "@/lib/shortcodes"
import { cn } from "@/lib/utils"

export function ShortcodePickerDialog({
  open,
  onPick,
  onClose,
}: {
  open: boolean
  onPick: (token: string) => void
  onClose: () => void
}) {
  const titleId = useId()
  const searchId = useId()
  const [items, setItems] = useState<ShortcodeRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    if (!open) return
    setError(null)
    setQuery("")
    startTransition(async () => {
      try {
        const rows = await getAllShortcodesAction()
        setItems(rows)
      } catch {
        setItems([])
        setError("Не удалось загрузить шорткоды")
      }
    })
  }, [open])

  const filtered = useMemo(() => {
    if (!items) return []
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter(
      (row) =>
        row.name.toLowerCase().includes(q) ||
        row.value.toLowerCase().includes(q) ||
        (row.description ?? "").toLowerCase().includes(q),
    )
  }, [items, query])

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Popup
          aria-labelledby={titleId}
          className="fixed inset-x-4 top-[10vh] z-50 mx-auto flex max-h-[min(70vh,560px)] w-full max-w-lg flex-col overflow-hidden rounded-lg border border-admin-border bg-white shadow-xl outline-none overscroll-contain"
        >
          <div className="flex items-center justify-between gap-3 border-b border-admin-border px-4 py-3">
            <Dialog.Title id={titleId} className="text-base font-semibold text-pretty text-admin-fg">
              Шорткоды
            </Dialog.Title>
            <Dialog.Close
              type="button"
              className="rounded-md px-2 py-1.5 text-sm text-admin-fg-muted hover:bg-admin-muted hover:text-admin-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-fg/30"
              aria-label="Закрыть"
            >
              Закрыть
            </Dialog.Close>
          </div>

          <div className="border-b border-admin-border px-4 py-3">
            <label htmlFor={searchId} className="sr-only">
              Поиск шорткода
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-admin-fg-subtle" aria-hidden />
              <input
                id={searchId}
                type="search"
                name="shortcode-search"
                autoComplete="off"
                spellCheck={false}
                placeholder="Имя, значение или описание…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full rounded-md border border-admin-border bg-white py-2 pl-9 pr-3 text-sm text-admin-fg placeholder:text-admin-fg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-fg/30"
              />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-2" role="listbox" aria-label="Список шорткодов">
            {pending && items === null ? (
              <p className="px-3 py-6 text-center text-sm text-admin-fg-muted" aria-live="polite">
                Загрузка…
              </p>
            ) : null}
            {error ? (
              <p className="px-3 py-6 text-center text-sm text-red-700" role="alert">
                {error}
              </p>
            ) : null}
            {!pending && !error && items?.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-admin-fg-muted">
                Шорткодов нет. Добавьте в разделе «Шорткоды».
              </p>
            ) : null}
            {!error && filtered.length === 0 && (items?.length ?? 0) > 0 ? (
              <p className="px-3 py-6 text-center text-sm text-admin-fg-muted">Ничего не найдено</p>
            ) : null}
            <ul className="flex flex-col gap-1">
              {filtered.map((row) => {
                const token = `[${row.name}]`
                return (
                  <li key={row.id}>
                    <button
                      type="button"
                      role="option"
                      className={cn(
                        "flex w-full min-w-0 flex-col gap-0.5 rounded-md border border-transparent px-3 py-2.5 text-left transition-colors",
                        "hover:border-admin-border hover:bg-admin-muted",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-fg/30",
                      )}
                      onClick={() => {
                        onPick(token)
                        onClose()
                      }}
                    >
                      <span className="flex min-w-0 items-baseline gap-2">
                        <code translate="no" className="shrink-0 rounded bg-admin-muted px-1.5 py-0.5 font-mono text-sm text-sky-700">
                          {token}
                        </code>
                        <span className="truncate text-sm font-medium text-admin-fg">{row.name}</span>
                      </span>
                      {row.description ? (
                        <span className="line-clamp-2 text-sm text-admin-fg-muted">{row.description}</span>
                      ) : null}
                      <span className="truncate text-xs text-admin-fg-subtle" title={row.value}>
                        {row.value}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
