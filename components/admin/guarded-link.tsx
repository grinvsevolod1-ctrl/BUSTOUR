"use client"

import Link, { type LinkProps } from "next/link"
import { useRouter } from "next/navigation"
import { forwardRef, type AnchorHTMLAttributes } from "react"
import { useAdminDirty } from "@/components/admin/admin-dirty-provider"

type Props = LinkProps & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps>

export const GuardedLink = forwardRef<HTMLAnchorElement, Props>(
  function GuardedLink({ href, onNavigate, target, download, ...props }, ref) {
    const router = useRouter()
    const { hasDirtySources, confirmDiscard, runWithNavigationBypass } = useAdminDirty()
    const hrefText = typeof href === "string" ? href : href.pathname?.toString() ?? ""

    return (
      <Link
        ref={ref}
        href={href}
        target={target}
        download={download}
        {...props}
        onNavigate={(event) => {
          if (!hasDirtySources || download || (target && target !== "_self")) {
            onNavigate?.(event)
            return
          }
          const targetUrl = new URL(hrefText, window.location.href)
          const currentUrl = new URL(window.location.href)
          const sameDocumentHash =
            targetUrl.origin === currentUrl.origin &&
            targetUrl.pathname === currentUrl.pathname &&
            targetUrl.search === currentUrl.search &&
            targetUrl.hash !== currentUrl.hash
          if (sameDocumentHash || targetUrl.origin !== currentUrl.origin) {
            onNavigate?.(event)
            return
          }
          event.preventDefault()
          void (async () => {
            if (!(await confirmDiscard())) return
            onNavigate?.(event)
            await runWithNavigationBypass(() =>
              router.push(`${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`),
            )
          })()
        }}
      />
    )
  },
)