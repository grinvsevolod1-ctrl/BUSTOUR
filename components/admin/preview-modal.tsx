"use client"

import { useEffect, useState } from "react"
import { Dialog } from "@base-ui/react/dialog"
import { ExternalLink, Eye, LoaderCircle, X } from "lucide-react"
import { Button } from "@/components/admin/ui"

export function PreviewModal({
  url,
  title = "Предпросмотр",
  open,
  onClose,
}: {
  url: string
  title?: string
  open: boolean
  onClose: () => void
}) {
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (open) setLoading(true)
  }, [open, url])

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Popup className="fixed inset-3 z-50 m-auto flex max-h-[calc(100vh-1.5rem)] w-auto max-w-6xl flex-col overflow-hidden rounded-lg border border-admin-border bg-white shadow-xl outline-none">
          <div className="flex items-center justify-between gap-3 border-b border-admin-border px-4 py-3">
            <Dialog.Title className="truncate text-sm font-semibold text-admin-fg">{title}</Dialog.Title>
            <div className="flex shrink-0 items-center gap-1">
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-admin-border px-2.5 text-xs text-admin-fg-muted hover:bg-admin-muted hover:text-admin-fg"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Новая вкладка
              </a>
              <Dialog.Close
                type="button"
                className="rounded px-2 py-1 text-sm text-admin-fg-muted hover:bg-admin-muted"
                aria-label="Закрыть"
              >
                <X className="h-4 w-4" />
              </Dialog.Close>
            </div>
          </div>
          <div className="relative min-h-0 flex-1 bg-admin-muted/30">
            {loading ? (
              <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 text-sm text-admin-fg-muted">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Загрузка предпросмотра…
              </div>
            ) : null}
            {open ? (
              <iframe
                key={url}
                src={url}
                title={title}
                className="h-full min-h-[70vh] w-full border-0"
                onLoad={() => setLoading(false)}
              />
            ) : null}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export function ArchivePreviewButton({
  url,
  label,
}: {
  url?: string | null
  label: string
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={!url}
        title={url ? "Предпросмотр" : "Предпросмотр недоступен: нет публичного URL"}
        onClick={() => setOpen(true)}
      >
        <Eye className="h-3.5 w-3.5" />
        Предпросмотр
      </Button>
      {url ? (
        <PreviewModal
          url={url}
          title={`Предпросмотр · ${label}`}
          open={open}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  )
}
