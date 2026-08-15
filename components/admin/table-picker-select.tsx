"use client"

import { useTransition } from "react"
import type { ContentBlock } from "@/lib/types"
import { saveSettingsAction } from "@/app/admin/cms-actions"
import { getBlockLabel } from "@/lib/table-label"

export { getBlockLabel }

interface TablePickerSelectProps {
  /** e.g. "country:vetnam.section.resorts" */
  settingKey: string
  /** All resort blocks available for this page */
  blocks: ContentBlock[]
  /** Currently selected block id (stringified), or "" for "all" */
  currentValue: string
}

export function TablePickerSelect({ settingKey, blocks, currentValue }: TablePickerSelectProps) {
  const [, startTransition] = useTransition()

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value
    startTransition(async () => {
      const fd = new FormData()
      fd.set(settingKey, val)
      await saveSettingsAction(null, fd)
    })
  }

  if (blocks.length === 0) {
    return (
      <p className="text-sm text-admin-fg-muted italic">
        Таблиц пока нет.{" "}
        <a href="#resort-table" className="underline hover:text-admin-fg">
          Добавьте таблицу
        </a>{" "}
        в блоке «Таблицы» ниже.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-admin-fg-muted">
        Выберите, какую таблицу показывать в этой секции. Порядок и видимость управляются глазком выше.
      </p>
      <select
        value={currentValue}
        onChange={handleChange}
        className="w-full rounded-md border border-admin-border bg-white px-3 py-2 text-sm text-admin-fg shadow-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
      >
        <option value="">— Все таблицы (показать сразу все) —</option>
        {blocks.map((b) => (
          <option key={b.id} value={String(b.id)}>
            {getBlockLabel(b)}
          </option>
        ))}
      </select>
      {currentValue && (
        <p className="text-xs text-admin-fg-muted">
          Редактировать содержимое таблицы можно в блоке «Таблицы» ниже.
        </p>
      )}
    </div>
  )
}
