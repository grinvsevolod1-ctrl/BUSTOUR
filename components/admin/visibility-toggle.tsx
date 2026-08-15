"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { Eye, EyeOff } from "lucide-react"
import { saveSettingsAction } from "@/app/admin/cms-actions"
import { IconButton } from "@/components/admin/ui"
import { ConfirmDialog } from "@/components/admin/confirm-dialog"

export function VisibilityToggle({
  settingKey,
  visible,
  label,
}: {
  settingKey: string
  visible: boolean
  label: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  const next = !visible

  function confirmToggle() {
    setOpen(false)
    startTransition(async () => {
      const formData = new FormData()
      formData.set(settingKey, next ? "1" : "0")
      await saveSettingsAction(null, formData)
      router.refresh()
    })
  }

  function toggle() {
    if (pending) return
    setOpen(true)
  }

  return (
    <>
      <IconButton
        type="button"
        onClick={toggle}
        disabled={pending}
        aria-label={visible ? "Скрыть" : "Опубликовать"}
        title={`${visible ? "Скрыть" : "Опубликовать"}: ${label}`}
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </IconButton>
      <ConfirmDialog
        open={open}
        title={next ? "Опубликовать страницу" : "Скрыть страницу"}
        message={`${next ? "Опубликовать" : "Скрыть"} ${label}?`}
        confirmLabel={next ? "Опубликовать" : "Скрыть"}
        tone="neutral"
        pending={pending}
        onConfirm={confirmToggle}
        onCancel={() => setOpen(false)}
      />
    </>
  )
}
