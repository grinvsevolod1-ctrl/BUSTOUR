"use client"

import { useCallback, useEffect, useRef } from "react"
import { useAdminDirty, type AdminDirtyRegistration } from "@/components/admin/admin-dirty-provider"
import type { AdminSaveResult } from "@/lib/admin-save-state"

type UseAdminDirtyFormOpts = {
  id: string
  label: string
  isDirtyRef?: { current: boolean }
  onMarkDirty?: () => void
}

type UseAdminDirtyFormApi = {
  registration: AdminDirtyRegistration
  markDirty(): void
  markClean(): void
  wrapAction<T extends AdminSaveResult | Promise<AdminSaveResult>>(
    runAction: () => T,
  ): T extends Promise<AdminSaveResult> ? Promise<AdminSaveResult> : AdminSaveResult
  formInputHandlers(): {
    onChange: () => void
    onInput: () => void
  }
}

export function useAdminDirtyForm(opts: UseAdminDirtyFormOpts): UseAdminDirtyFormApi {
  const { id, label, isDirtyRef, onMarkDirty } = opts
  const { registerDirtySource } = useAdminDirty()
  const regRef = useRef<AdminDirtyRegistration | null>(null)
  if (regRef.current === null) {
    regRef.current = registerDirtySource({ id, label })
  }

  const registration = regRef.current!

  useEffect(() => registration.unregister, [registration])

  const markDirty = useCallback(() => {
    registration.markDirty()
    if (isDirtyRef) isDirtyRef.current = true
    onMarkDirty?.()
  }, [registration, isDirtyRef, onMarkDirty])

  const markClean = useCallback(() => {
    registration.markClean()
    if (isDirtyRef) isDirtyRef.current = false
  }, [registration, isDirtyRef])

  const wrapAction = useCallback(
    <T extends AdminSaveResult | Promise<AdminSaveResult>>(
      runAction: () => T,
    ): T extends Promise<AdminSaveResult> ? Promise<AdminSaveResult> : AdminSaveResult => {
      const result = runAction()
      if (result && typeof (result as Promise<AdminSaveResult>).then === "function") {
        return (async () => {
          const res = await (result as Promise<AdminSaveResult>)
          if (res?.ok) markClean()
          return res
        })() as T extends Promise<AdminSaveResult> ? Promise<AdminSaveResult> : AdminSaveResult
      }
      const sync = result as AdminSaveResult
      if (sync?.ok) markClean()
      return sync as T extends Promise<AdminSaveResult> ? Promise<AdminSaveResult> : AdminSaveResult
    },
    [markClean],
  )

  // NOTE: intentionally no onBlur — merely focusing and leaving a field
  // must not mark the form dirty (it caused false "unsaved changes" dialogs).
  const formInputHandlers = useCallback(
    () => ({
      onChange: markDirty,
      onInput: markDirty,
    }),
    [markDirty],
  )

  return { registration, markDirty, markClean, wrapAction, formInputHandlers }
}
