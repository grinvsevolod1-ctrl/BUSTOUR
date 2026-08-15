"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Analytics } from "@vercel/analytics/next"
import { useConsentCategory } from "consentium"
import {
  analyticsConfigFromSettings,
  setAnalyticsRuntime,
} from "@/lib/analytics"

const YM_ID = /^\d{4,12}$/
const GTM_ID = /^GTM-[A-Z0-9]+$/i
const GA_ID = /^G-[A-Z0-9]+$/i

function appendScript(id: string, src: string, onLoad?: () => void) {
  if (document.getElementById(id)) return
  const script = document.createElement("script")
  script.id = id
  script.async = true
  script.src = src
  if (onLoad) script.addEventListener("load", onLoad, { once: true })
  document.head.appendChild(script)
}

/** Load analytics only after the visitor grants the analytics category. */
export function AnalyticsWhenConsented({ settings }: { settings: Record<string, string> }) {
  const allowed = useConsentCategory("analytics")
  const router = useRouter()
  const config = analyticsConfigFromSettings(settings)

  useEffect(() => {
    setAnalyticsRuntime(config, allowed)
    if (!allowed) return

    const target = window as Window & {
      dataLayer?: unknown[]
      ym?: (...args: unknown[]) => void
      gtag?: (...args: unknown[]) => void
      __bustourGtmId?: string
      __bustourGaId?: string
      __bustourYmId?: string
    }
    target.dataLayer = target.dataLayer || []

    if (GTM_ID.test(config.gtmId) && target.__bustourGtmId !== config.gtmId) {
      target.__bustourGtmId = config.gtmId
      target.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" })
      appendScript("bustour-gtm", `https://www.googletagmanager.com/gtm.js?id=${config.gtmId}`)
    }
    if (GA_ID.test(config.gaMeasurementId) && target.__bustourGaId !== config.gaMeasurementId) {
      target.__bustourGaId = config.gaMeasurementId
      target.gtag = target.gtag || ((...args: unknown[]) => target.dataLayer!.push(args))
      target.gtag("js", new Date())
      target.gtag("config", config.gaMeasurementId)
      appendScript(
        "bustour-ga4",
        `https://www.googletagmanager.com/gtag/js?id=${config.gaMeasurementId}`,
      )
    }
    if (YM_ID.test(config.ymCounterId) && target.__bustourYmId !== config.ymCounterId) {
      target.__bustourYmId = config.ymCounterId
      target.ym = target.ym || ((...args: unknown[]) => {
        const queue = target.ym as ((...items: unknown[]) => void) & { a?: unknown[] }
        ;(queue.a ||= []).push(args)
      })
      target.ym(Number(config.ymCounterId), "init", {
        clickmap: true,
        trackLinks: true,
        accurateTrackBounce: true,
        webvisor: config.enableWebvisor,
      })
      appendScript("bustour-yandex-metrika", "https://mc.yandex.ru/metrika/tag.js")
    }
  }, [
    allowed,
    config.enableWebvisor,
    config.gaMeasurementId,
    config.goalCallbackSuccess,
    config.goalLeadSuccess,
    config.goalReviewSuccess,
    config.gtmId,
    config.successRedirectUrl,
    config.ymCounterId,
  ])

  useEffect(() => {
    if (!config.successRedirectUrl) return
    const redirect = () => router.push(config.successRedirectUrl)
    window.addEventListener("lead_success", redirect)
    window.addEventListener("review_success", redirect)
    return () => {
      window.removeEventListener("lead_success", redirect)
      window.removeEventListener("review_success", redirect)
    }
  }, [config.successRedirectUrl, router])

  // Vercel Web Analytics works only when deployed on Vercel; on self-hosted
  // (pm2/nginx) the /_vercel/insights script 404s — skip it there.
  const onVercel = Boolean(process.env.NEXT_PUBLIC_VERCEL_ENV)
  return allowed && onVercel && process.env.NODE_ENV === "production" ? <Analytics /> : null
}
