"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, type ReactNode } from "react"
import { ConsentProvider, CookieBanner, useConsent } from "consentium"
import { consentCopyRu } from "@/lib/consent-copy-ru"
import { CONSENT_TTL_MS, consentConfig } from "@/lib/consent.config"
import { CONSENT_REOPEN_EVENT } from "@/lib/consent-events"

function ConsentTtlGuard() {
  const { store, record } = useConsent()

  useEffect(() => {
    if (record.status !== "configured" || !record.ts) return
    if (Date.now() - record.ts < CONSENT_TTL_MS) return
    store.reopenBanner()
  }, [record.status, record.ts, store])

  useEffect(() => {
    const onReopen = () => store.reopenBanner()
    window.addEventListener(CONSENT_REOPEN_EVENT, onReopen)
    return () => window.removeEventListener(CONSENT_REOPEN_EVENT, onReopen)
  }, [store])

  return null
}

export function SiteConsent({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  // В админке cookie-баннер не показываем: это служебная панель без
  // маркетинговой аналитики, а fixed-баннер перекрывает модалки админки.
  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/")

  return (
    <ConsentProvider config={consentConfig} copy={consentCopyRu} linkComponent={Link}>
      {children}
      {!isAdmin ? (
        <>
          <ConsentTtlGuard />
          <CookieBanner />
        </>
      ) : null}
    </ConsentProvider>
  )
}
