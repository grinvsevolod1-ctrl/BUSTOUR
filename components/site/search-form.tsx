"use client"

import Script from "next/script"
import { useEffect } from "react"

export function SearchForm() {
  useEffect(() => {
    // Tourvisor делает XHR-запросы к своему серверу.
    // На неавторизованных доменах (preview) запросы падают с ошибкой,
    // которая всплывает как unhandledRejection — перехватываем её здесь.
    const handler = (event: PromiseRejectionEvent) => {
      const msg = event.reason?.message ?? String(event.reason)
      if (msg.includes("sessionKey") || msg.includes("tourvisor")) {
        event.preventDefault()
      }
    }
    window.addEventListener("unhandledrejection", handler)
    return () => window.removeEventListener("unhandledrejection", handler)
  }, [])

  return (
    <>
      <div className="tv-search-form tv-moduleid-9974602"></div>
      <Script
        src="https://tourvisor.ru/module/init.js"
        strategy="lazyOnload"
      />
    </>
  )
}
