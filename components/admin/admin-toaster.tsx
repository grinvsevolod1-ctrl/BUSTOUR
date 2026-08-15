"use client"

import { Suspense, useEffect, useRef } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Toaster, toast } from "sonner"

const NOTICE_MESSAGES: Record<string, string> = {
  archived: "Страница перенесена в архив",
  restored: "Запись восстановлена",
  purged: "Запись удалена навсегда",
}

function FlashFromQuery() {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  const seen = useRef<string | null>(null)

  useEffect(() => {
    const notice = searchParams.get("notice")
    const error = searchParams.get("error")
    const key = `${notice ?? ""}|${error ?? ""}`
    if (!notice && !error) {
      seen.current = null
      return
    }
    if (seen.current === key) return
    seen.current = key

    if (notice && NOTICE_MESSAGES[notice]) toast.success(NOTICE_MESSAGES[notice])
    else if (notice) toast.success(notice)
    if (error) toast.error(error)

    const next = new URLSearchParams(searchParams.toString())
    next.delete("notice")
    next.delete("error")
    const qs = next.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }, [searchParams, pathname, router])

  return null
}

/** Admin-only Toaster + flash toasts from `?notice=` / `?error=` after Server Action redirects. */
export function AdminToaster() {
  return (
    <>
      <Toaster richColors position="bottom-right" closeButton />
      <Suspense fallback={null}>
        <FlashFromQuery />
      </Suspense>
    </>
  )
}
