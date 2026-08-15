"use client"

import { useRef, useState } from "react"
import { useFormStatus } from "react-dom"
import { ConfirmDialog } from "@/components/admin/confirm-dialog"

function PendingGuard({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus()
  return (
    <fieldset disabled={pending} className={pending ? "pointer-events-none opacity-60" : undefined}>
      {children}
    </fieldset>
  )
}

export function ConfirmActionForm({
  action,
  message,
  children,
  title = "Подтвердите удаление",
  confirmLabel = "Удалить",
}: {
  action: (formData: FormData) => void | Promise<void>
  message: string
  children: React.ReactNode
  title?: string
  confirmLabel?: string
}) {
  const formRef = useRef<HTMLFormElement>(null)
  const confirmedRef = useRef(false)
  const [open, setOpen] = useState(false)

  function confirmDelete() {
    confirmedRef.current = true
    setOpen(false)
    formRef.current?.requestSubmit()
  }

  return (
    <>
      <form
        ref={formRef}
        action={action}
        onSubmit={(event) => {
          if (confirmedRef.current) {
            confirmedRef.current = false
            return
          }
          event.preventDefault()
          setOpen(true)
        }}
      >
        <PendingGuard>{children}</PendingGuard>
      </form>
      <ConfirmDialog
        open={open}
        title={title}
        message={message}
        confirmLabel={confirmLabel}
        tone="danger"
        onConfirm={confirmDelete}
        onCancel={() => setOpen(false)}
      />
    </>
  )
}
