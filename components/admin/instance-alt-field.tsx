"use client"

import { useEffect, useState } from "react"
import type { UploadedFile } from "@/components/admin/media-uploader"
import { Input } from "@/components/admin/ui"
import { instanceAltPlaceholder, isMediaLibraryId } from "@/lib/media/node"

/** Local override alt for a page binding (cover/gallery). Does not PATCH media library. */
export function InstanceAltField({
  file,
  onChange,
}: {
  file: UploadedFile
  onChange: (next: UploadedFile) => void
}) {
  const [value, setValue] = useState(file.customAlt ?? "")
  const [libraryAlt, setLibraryAlt] = useState(file.alt ?? "")

  useEffect(() => {
    setValue(file.customAlt ?? "")
  }, [file.id, file.customAlt])

  useEffect(() => {
    setLibraryAlt(file.alt ?? "")
  }, [file.id, file.alt])

  useEffect(() => {
    if (file.alt?.trim() || !isMediaLibraryId(file.id)) return
    let cancelled = false
    void fetch(`/api/media/${file.id}`, { credentials: "same-origin" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { alt?: string } | null) => {
        const alt = payload?.alt?.trim()
        if (!cancelled && alt) setLibraryAlt(alt)
      })
      .catch(() => {
        // ponytail: placeholder stays "пусто" if library lookup fails
      })
    return () => {
      cancelled = true
    }
  }, [file.id, file.alt])

  if (file.type !== "image") return null

  return (
    <div className="border-t border-admin-border px-2 py-1.5" onClick={(event) => event.stopPropagation()}>
      <label className="mb-0.5 block text-[10px] font-medium text-admin-fg-muted">Alt (эта страница)</label>
      <Input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onBlur={() => {
          const next = value.trim()
          if (next === (file.customAlt ?? "").trim()) return
          onChange({ ...file, customAlt: next || undefined })
        }}
        onKeyDown={(event) => {
          event.stopPropagation()
          if (event.key === "Enter") {
            event.preventDefault()
            ;(event.currentTarget as HTMLInputElement).blur()
          }
        }}
        onClick={(event) => event.stopPropagation()}
        placeholder={instanceAltPlaceholder(libraryAlt)}
        className="h-7 px-2 text-xs"
        aria-label={`Alt для ${file.name} на этой странице`}
      />
    </div>
  )
}
