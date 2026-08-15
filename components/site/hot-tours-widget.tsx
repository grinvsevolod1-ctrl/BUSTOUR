"use client"

import { useEffect, useRef, useState } from "react"
import { injectTourvisorInit, teardownTourvisorHost } from "@/lib/tourvisor-widget"

export function HotToursWidget() {
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
  }, [])

  return (
    <>
      {!loaded && (
        <div className="flex min-h-[220px] items-center justify-center rounded-xl border border-line bg-cream/60">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-brand" />
            <span className="text-sm text-ink-muted">Загружаем горящие туры…</span>
          </div>
        </div>
      )}
      <div
        ref={hostRef}
        className="tv-hot-tours tv-moduleid-9986280"
        style={loaded ? undefined : { position: "absolute", opacity: 0, pointerEvents: "none" }}
      />
    </>
  )
}
