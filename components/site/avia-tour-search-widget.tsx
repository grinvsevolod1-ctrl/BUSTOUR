"use client"

import { useEffect, useRef, useState } from "react"
import { injectTourvisorInit, teardownTourvisorHost } from "@/lib/tourvisor-widget"

interface Props {
  /** Tourvisor country ID to preselect in the widget */
  countryId?: number
  /** Tourvisor city/resort ID to preselect in the widget */
  cityId?: number
}

export function AviaTourSearchWidget({ countryId, cityId }: Props) {
  const [loaded, setLoaded] = useState(false)
  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (event: PromiseRejectionEvent) => {
      const msg = event.reason?.message ?? String(event.reason)
      if (msg.includes("sessionKey") || msg.includes("tourvisor")) {
        event.preventDefault()
      }
    }
    window.addEventListener("unhandledrejection", handler)
    return () => window.removeEventListener("unhandledrejection", handler)
  }, [])

  useEffect(() => {
    setLoaded(false)
    const host = hostRef.current
    teardownTourvisorHost(host)
    const script = injectTourvisorInit(() => setLoaded(true))
    return () => {
      script.remove()
      teardownTourvisorHost(host)
    }
  }, [countryId, cityId])

  return (
    <>
      {!loaded && (
        <div className="flex min-h-[220px] items-center justify-center rounded-xl border border-line bg-cream/60">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-brand" />
            <span className="text-sm text-ink-muted">Загружаем форму поиска…</span>
          </div>
        </div>
      )}
      <div
        key={`${countryId ?? ""}-${cityId ?? ""}`}
        ref={hostRef}
        className="tv-search-form tv-moduleid-9974602"
        data-country={countryId ?? undefined}
        data-city={cityId ?? undefined}
        style={loaded ? undefined : { position: "absolute", opacity: 0, pointerEvents: "none" }}
      />
    </>
  )
}
