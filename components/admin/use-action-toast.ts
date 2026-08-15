"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

type ActionFlash = {
  error?: string
  success?: boolean
  ok?: boolean
} | null

/**
 * Toast + optional router.refresh for useActionState results.
 * Keeps forms from "going silent" on error/success without redirect.
 */
export function useActionToast(
  state: ActionFlash,
  opts?: { successMessage?: string; refresh?: boolean },
) {
  const router = useRouter()
  const seen = useRef<ActionFlash>(null)
  const successMessage = opts?.successMessage ?? "Сохранено"
  const refresh = opts?.refresh ?? true

  useEffect(() => {
    if (!state || state === seen.current) return
    seen.current = state
    if (state.error) {
      toast.error(state.error)
      return
    }
    if (state.success || state.ok) {
      toast.success(successMessage)
      if (refresh) router.refresh()
    }
  }, [state, successMessage, refresh, router])
}
