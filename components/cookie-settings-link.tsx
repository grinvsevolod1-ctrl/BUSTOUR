"use client"

import { consentCopyRu } from "@/lib/consent-copy-ru"
import { dispatchConsentReopen } from "@/lib/consent-events"

/** Footer / legal re-open control — event bus, not consentium CookieSettingsLink (Turbopack context dup). */
export function SiteCookieSettingsLink({ className }: { className?: string }) {
  return (
    <button
      type="button"
      className={className}
      style={{
        background: "none",
        border: "none",
        padding: 0,
        cursor: "pointer",
        color: "inherit",
        font: "inherit",
        textDecoration: "underline",
      }}
      onClick={() => dispatchConsentReopen()}
    >
      {consentCopyRu.settingsLink?.label ?? "Настроить Cookies"}
    </button>
  )
}
