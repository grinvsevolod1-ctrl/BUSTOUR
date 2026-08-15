"use client"

import { useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useAdminDirty } from "@/components/admin/admin-dirty-provider"

export function useGuardedRouter() {
  const router = useRouter()
  const { confirmDiscard, runWithNavigationBypass } = useAdminDirty()
  const guard = useCallback(
    async (operation: () => void) => {
      if (await confirmDiscard()) await runWithNavigationBypass(operation)
    },
    [confirmDiscard, runWithNavigationBypass],
  )
  return useMemo(
    () => ({
      ...router,
      push: (href: string, options?: Parameters<typeof router.push>[1]) => {
        void guard(() => router.push(href, options))
      },
      replace: (href: string, options?: Parameters<typeof router.replace>[1]) => {
        void guard(() => router.replace(href, options))
      },
      back: () => {
        void guard(() => router.back())
      },
    }),
    [router, guard],
  )
}