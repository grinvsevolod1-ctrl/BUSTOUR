"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import type { MediaItem, UploadedFile } from "@/components/admin/media-uploader"
import { isPersistedMediaId, updateMediaAlt } from "@/lib/media"
import { Input } from "@/components/admin/ui"

/** Compact alt editor for persisted library images. */
export function MediaAltField({
  file,
  onSaved,
}: {
  file: UploadedFile | MediaItem
  onSaved?: (next: MediaItem) => void
}) {
  const [value, setValue] = useState(file.alt ?? "")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setValue(file.alt ?? "")
  }, [file.id, file.alt])

  if (file.type !== "image" || !isPersistedMediaId(file.id)) return null

  async function save() {
    const nextAlt = value.trim()
    if (nextAlt === (file.alt ?? "").trim()) return
    setSaving(true)
    try {
      const updated = await updateMediaAlt(file.id, nextAlt)
      onSaved?.(updated)
      toast.success("Alt по умолчанию сохранён")
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Не удалось сохранить Alt по умолчанию")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="border-t border-admin-border px-2 py-1.5" onClick={(event) => event.stopPropagation()}>
      <label className="mb-0.5 block text-[10px] font-medium text-admin-fg-muted">Alt по умолчанию</label>
      <Input
        value={value}
        disabled={saving}
        onChange={(event) => setValue(event.target.value)}
        onBlur={() => void save()}
        onKeyDown={(event) => {
          event.stopPropagation()
          if (event.key === "Enter") {
            event.preventDefault()
            ;(event.currentTarget as HTMLInputElement).blur()
          }
        }}
        onClick={(event) => event.stopPropagation()}
        placeholder="Описание изображения"
        className="h-7 px-2 text-xs"
        aria-label={`Alt по умолчанию для ${file.name}`}
      />
    </div>
  )
}
