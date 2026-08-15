"use client"

import { Dialog } from "@base-ui/react/dialog"
import type { MediaType, UploadedFile } from "@/components/admin/media-uploader"
import { MediaExplorer } from "@/components/admin/media-explorer"

export function MediaPickerDialog({
  open,
  lockType,
  allowedTypes,
  onPick,
  onClose,
}: {
  open: boolean
  lockType?: MediaType
  allowedTypes?: MediaType[]
  onPick: (file: UploadedFile) => void
  onClose: () => void
}) {
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose()
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Popup className="fixed inset-4 z-50 m-auto flex max-h-[calc(100vh-2rem)] w-auto max-w-6xl flex-col overflow-hidden rounded-lg border border-admin-border bg-white shadow-xl outline-none">
          <div className="flex items-center justify-between border-b border-admin-border px-5 py-4">
            <Dialog.Title className="text-base font-semibold text-admin-fg">Выбрать медиа</Dialog.Title>
            <Dialog.Close
              type="button"
              className="rounded px-2 py-1 text-sm text-admin-fg-muted hover:bg-admin-muted"
              aria-label="Закрыть"
            >
              Закрыть
            </Dialog.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            <MediaExplorer onPick={onPick} lockType={lockType} allowedTypes={allowedTypes} />
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
