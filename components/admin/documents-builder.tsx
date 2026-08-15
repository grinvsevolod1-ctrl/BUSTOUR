"use client"

import { useState } from "react"
import { Plus, Trash2 } from "lucide-react"
import type { TourDocument } from "@/lib/types"
import {
  MediaUploader,
  uploadedFileFromUrl,
  type UploadedFile,
} from "@/components/admin/media-uploader"
import { Button, Input, Label, IconButton } from "@/components/admin/ui"

export function DocumentsBuilder({
  documents: initial = [],
  name = "documents",
  emptyHint = "Документов нет. Добавьте ссылку на файл.",
  addLabel = "Документ",
}: {
  documents?: TourDocument[]
  name?: string
  emptyHint?: string
  addLabel?: string
}) {
  const [docs, setDocs] = useState<TourDocument[]>(initial.length ? initial : [])

  const update = (i: number, patch: Partial<TourDocument>) =>
    setDocs((d) => d.map((x, idx) => (idx === i ? { ...x, ...patch } : x)))

  const updateFile = (i: number, file: UploadedFile | null) =>
    setDocs((current) =>
      current.map((doc, index) => {
        if (index !== i) return doc
        if (!file) return { ...doc, href: "", size: "" }

        return {
          ...doc,
          title: doc.title.trim() ? doc.title : file.name,
          href: file.url,
          size: file.size,
        }
      }),
    )

  return (
    <div className="space-y-3">
      {/* Serialized payload for the server action */}
      <input
        type="hidden"
        name={name}
        value={JSON.stringify(docs.filter((d) => d.title.trim() || d.href.trim()))}
      />

      {docs.map((doc, i) => (
        <div key={i} className="space-y-2 rounded-md border border-admin-border p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-admin-fg">
              {addLabel} {i + 1}
            </span>
            <IconButton
              type="button"
              tone="danger"
              onClick={() => setDocs((d) => d.filter((_, idx) => idx !== i))}
              aria-label={`Удалить: ${addLabel}`}
            >
              <Trash2 className="h-4 w-4" />
            </IconButton>
          </div>
          <div>
            <Label>Название</Label>
            <Input value={doc.title} onChange={(e) => update(i, { title: e.target.value })} placeholder="Программа тура (PDF)" />
          </div>
          <MediaUploader
            value={
              doc.href
                ? { ...uploadedFileFromUrl(doc.href), size: doc.size }
                : null
            }
            onChange={(file) => updateFile(i, file)}
            accept={["document"]}
            label="Файл документа"
          />
        </div>
      ))}

      {docs.length === 0 ? (
        <p className="text-sm text-admin-fg-subtle">{emptyHint}</p>
      ) : null}

      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => setDocs((d) => [...d, { title: "", href: "", size: "" }])}
      >
        <Plus className="h-4 w-4" /> {addLabel}
      </Button>
    </div>
  )
}
