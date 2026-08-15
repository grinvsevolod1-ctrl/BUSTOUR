"use client"

import { useState } from "react"
import {
  ChevronUp,
  ChevronDown,
  GripVertical,
  Pencil,
  Eye,
  EyeOff,
  Trash2,
  Plus,
  X,
  Check,
} from "lucide-react"
import type { TourSection } from "@/lib/types"
import { resolveTourLayout, anchoredSectionKeys, missingTourSections } from "@/lib/tour-sections"
import { IconButton, Input } from "@/components/admin/ui"
import { cn } from "@/lib/utils"

const sectionAnchors: Partial<Record<TourSection["key"], string>> = {
  dates: "s-dates",
  program: "s-program",
  included: "s-included",
  seo: "s-seo",
  documents: "s-docs",
  gallery: "s-gallery",
  faq: "s-faq",
}

export function TourLayoutBuilder({
  layout: initial,
  onChange,
}: {
  layout?: TourSection[]
  onChange?: (sections: TourSection[]) => void
}) {
  const [sections, setSections] = useState<TourSection[]>(() => resolveTourLayout(initial))
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [editingLabelIndex, setEditingLabelIndex] = useState<number | null>(null)
  const [labelDraft, setLabelDraft] = useState("")

  function commit(next: TourSection[]) {
    setSections(next)
    onChange?.(next)
  }

  const move = (i: number, dir: 1 | -1) =>
    commit(
      (() => {
        const j = i + dir
        if (j < 0 || j >= sections.length) return sections
        const copy = [...sections]
        ;[copy[i], copy[j]] = [copy[j], copy[i]]
        return copy
      })(),
    )

  const update = (i: number, patch: Partial<TourSection>) =>
    commit(sections.map((x, idx) => (idx === i ? { ...x, ...patch } : x)))

  const remove = (i: number) => commit(sections.filter((_, idx) => idx !== i))

  const add = (sec: TourSection) => {
    if (sections.some((s) => s.key === sec.key)) return
    commit([...sections, { ...sec, visible: true }])
    setPickerOpen(false)
  }

  // ponytail: native HTML5 DnD uses index-based reordering, which is sufficient for this small static list.
  function dropAt(targetIndex: number) {
    if (dragIndex === null || dragIndex === targetIndex) {
      setDragIndex(null)
      setDragOverIndex(null)
      return
    }
    const next = [...sections]
    const [moved] = next.splice(dragIndex, 1)
    next.splice(targetIndex, 0, moved)
    commit(next)
    setDragIndex(null)
    setDragOverIndex(null)
  }

  const deleted = missingTourSections(sections)

  return (
    <div className="space-y-2">
      <input type="hidden" name="layout" value={JSON.stringify(sections)} />

      {sections.map((s, i) => {
        const anchored = anchoredSectionKeys.includes(s.key)
        return (
          <div
            key={s.key}
            draggable
            onDragStart={() => {
              setDragIndex(i)
              setDragOverIndex(i)
            }}
            onDragOver={(event) => {
              event.preventDefault()
              setDragOverIndex(i)
            }}
            onDrop={(event) => {
              event.preventDefault()
              dropAt(i)
            }}
            onDragEnd={() => {
              setDragIndex(null)
              setDragOverIndex(null)
            }}
            className={cn(
              "flex items-center gap-3 rounded-md border p-3 transition-colors",
              dragOverIndex === i && dragIndex !== i
                ? "border-admin-fg bg-admin-muted/60"
                : "border-admin-border",
              !s.visible && "opacity-60",
            )}
          >
            <span
              className="cursor-grab text-admin-fg-subtle active:cursor-grabbing"
              aria-label="Перетащить блок"
              title="Перетащить блок"
            >
              <GripVertical className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="flex flex-col">
              <IconButton
                type="button"
                onClick={() => move(i, -1)}
                disabled={i === 0}
                aria-label="Выше"
                className="disabled:opacity-30"
              >
                <ChevronUp className="h-4 w-4" />
              </IconButton>
              <IconButton
                type="button"
                onClick={() => move(i, 1)}
                disabled={i === sections.length - 1}
                aria-label="Ниже"
                className="disabled:opacity-30"
              >
                <ChevronDown className="h-4 w-4" />
              </IconButton>
            </div>
            <div className="flex-1">
              {editingLabelIndex === i ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    const v = labelDraft.trim()
                    if (v) update(i, { label: v })
                    setEditingLabelIndex(null)
                  }}
                >
                  <Input
                    autoFocus
                    size={1}
                    className="w-full text-sm"
                    value={labelDraft}
                    onChange={(e) => setLabelDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        e.preventDefault()
                        setEditingLabelIndex(null)
                      }
                    }}
                  />
                </form>
              ) : (
                <span className="text-sm font-medium text-admin-fg">{s.label}</span>
              )}
              <p className="mt-1 text-xs text-admin-fg-subtle">
                {anchored ? "Показывается кнопкой в навбаре." : "Без кнопки в навбаре."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (editingLabelIndex === i) {
                  const v = labelDraft.trim()
                  if (v) update(i, { label: v })
                  setEditingLabelIndex(null)
                } else {
                  setEditingLabelIndex(i)
                  setLabelDraft(s.label)
                }
              }}
              title={editingLabelIndex === i ? "Сохранить заголовок" : "Изменить заголовок"}
              className="inline-flex shrink-0 items-center gap-1 rounded px-2 py-1 text-xs text-admin-fg-muted transition-colors hover:bg-admin-muted hover:text-admin-fg"
            >
              {editingLabelIndex === i ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <Pencil className="h-3.5 w-3.5" />
              )}
            </button>
            {sectionAnchors[s.key] ? (
              <button
                type="button"
                onClick={() => {
                  window.location.hash = `#${sectionAnchors[s.key]}`
                }}
                className="inline-flex shrink-0 items-center gap-1 rounded px-2 py-1 text-xs text-admin-fg-muted transition-colors hover:bg-admin-muted hover:text-admin-fg"
              >
                <Pencil className="h-3.5 w-3.5" />
                Перейти к редактированию
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => update(i, { visible: !s.visible })}
              title={s.visible ? "Скрыть секцию на сайте" : "Показать секцию на сайте"}
              className={cn(
                "inline-flex shrink-0 items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors",
                s.visible
                  ? "text-admin-fg-muted hover:bg-amber-50 hover:text-amber-700"
                  : "text-green-700 hover:bg-green-50",
              )}
            >
              {s.visible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
            <button
              type="button"
              onClick={() => remove(i)}
              title="Удалить секцию со страницы"
              className="rounded px-2 py-1 text-xs text-admin-fg-muted hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )
      })}

      {deleted.length > 0 ? (
        <div className="relative mt-4">
          <button
            type="button"
            onClick={() => setPickerOpen((v) => !v)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-admin-border px-4 py-3 text-sm text-admin-fg-muted transition-colors hover:border-admin-fg/40 hover:text-admin-fg"
          >
            <Plus className="h-4 w-4" />
            Добавить секцию
            <span className="ml-1 rounded-full bg-admin-muted px-1.5 py-0.5 text-xs font-medium text-admin-fg-muted">
              {deleted.length}
            </span>
          </button>
          {pickerOpen ? (
            <div className="mt-2 rounded-lg border border-admin-border bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-admin-border px-4 py-3">
                <span className="text-sm font-semibold text-admin-fg">
                  Удалённые секции — нажмите, чтобы вернуть
                </span>
                <button
                  type="button"
                  onClick={() => setPickerOpen(false)}
                  className="grid h-7 w-7 place-items-center rounded text-admin-fg-muted hover:bg-admin-muted hover:text-admin-fg"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 md:grid-cols-4">
                {deleted.map((sec) => (
                  <button
                    key={sec.key}
                    type="button"
                    onClick={() => add(sec)}
                    className="group flex flex-col gap-2 rounded-lg border border-admin-border p-3 text-left transition-colors hover:border-brand hover:bg-brand/5"
                  >
                    <span className="text-xs font-medium leading-snug text-admin-fg">{sec.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
