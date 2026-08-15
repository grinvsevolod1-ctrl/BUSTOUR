"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { resolveMapEmbedUrl } from "@/lib/office-map"
import { SectionTitle } from "@/components/site/section-title"

export { DEFAULT_MAP_EMBED_URL, resolveMapEmbedUrl } from "@/lib/office-map"

function iframeLooksBlocked(el: HTMLIFrameElement): boolean {
  const style = getComputedStyle(el)
  if (style.display === "none" || style.visibility === "hidden") return true
  if (Number.parseFloat(style.opacity || "1") === 0) return true
  if (el.hasAttribute("hidden")) return true
  // Adblock often collapses the node while the shell still has height.
  if (el.clientHeight < 8 || el.clientWidth < 8) return true
  return false
}

/**
 * Client-mounted iframe: adblockers inject display:none on Yandex map-widget
 * (hydration mismatch + empty map). SSR = same-size shell; if blocked → null.
 */
export function OfficeMap({
  src,
  title = "Карта — офис БасТур",
  className,
  heightClassName = "h-[360px]",
  onBlocked,
}: {
  src?: string
  title?: string
  className?: string
  heightClassName?: string
  /** Fired once when the iframe is hidden/collapsed by an extension. */
  onBlocked?: () => void
}) {
  const ref = useRef<HTMLIFrameElement>(null)
  const reported = useRef(false)
  const [ready, setReady] = useState(false)
  const [blocked, setBlocked] = useState(false)

  useEffect(() => {
    setReady(true)
  }, [])

  useEffect(() => {
    if (!ready || blocked) return
    const el = ref.current
    if (!el) return

    const report = () => {
      if (reported.current) return
      reported.current = true
      setBlocked(true)
      onBlocked?.()
    }

    const check = () => {
      if (iframeLooksBlocked(el)) report()
    }

    el.addEventListener("error", report)
    const t1 = window.setTimeout(check, 300)
    const t2 = window.setTimeout(check, 1200)
    const t3 = window.setTimeout(check, 2800)
    const obs = new MutationObserver(check)
    obs.observe(el, { attributes: true, attributeFilter: ["style", "class", "hidden"] })

    return () => {
      el.removeEventListener("error", report)
      window.clearTimeout(t1)
      window.clearTimeout(t2)
      window.clearTimeout(t3)
      obs.disconnect()
    }
  }, [ready, blocked, onBlocked])

  if (blocked) return null

  const shellClass = cn("w-full border-0 bg-cream", heightClassName, className)

  if (!ready) {
    return <div className={shellClass} aria-hidden role="presentation" />
  }

  return (
    <iframe
      ref={ref}
      title={title}
      src={resolveMapEmbedUrl(src)}
      className={shellClass}
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
      allowFullScreen
      suppressHydrationWarning
    />
  )
}

/** Heading + map; entire block unmounts if the map iframe is adblocked. */
export function OfficeMapBlock({
  src,
  heading,
  className,
  frameClassName = "overflow-hidden rounded border border-line",
  heightClassName,
}: {
  src?: string
  heading?: string
  className?: string
  frameClassName?: string
  heightClassName?: string
}) {
  const [blocked, setBlocked] = useState(false)
  if (blocked) return null

  return (
    <section className={className}>
      {heading ? <SectionTitle>{heading}</SectionTitle> : null}
      <div className={cn(heading ? "mt-0" : undefined, frameClassName)}>
        <OfficeMap src={src} heightClassName={heightClassName} onBlocked={() => setBlocked(true)} />
      </div>
    </section>
  )
}
