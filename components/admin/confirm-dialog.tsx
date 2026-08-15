"use client"

import { Dialog } from "@base-ui/react/dialog"
import { Button } from "@/components/admin/ui"

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  tone = "neutral",
  pending = false,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  message: string
  confirmLabel: string
  tone?: "neutral" | "danger"
  pending?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !pending) onCancel()
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Popup className="fixed inset-0 z-50 m-auto h-fit w-[calc(100%-2rem)] max-w-md rounded-lg border border-admin-border bg-white p-5 shadow-xl outline-none">
          <Dialog.Title className="text-base font-semibold text-admin-fg">{title}</Dialog.Title>
          <Dialog.Description className="mt-2 text-sm leading-relaxed text-admin-fg-muted">
            {message}
          </Dialog.Description>
          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onCancel} disabled={pending}>
              Отмена
            </Button>
            <Button
              autoFocus
              type="button"
              variant={tone === "danger" ? "danger" : "secondary"}
              onClick={onConfirm}
              disabled={pending}
            >
              {pending ? "Подождите…" : confirmLabel}
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
