import { CallUs } from "@/components/site/call-us"
import { isOn } from "@/lib/cms"
import { isCallusSectionKey } from "@/lib/multipliable-sections"
import type { SiteSettings } from "@/lib/types"

/** One «Есть вопросы?» slot in section order (`callus` / `callus2` / …). */
export function OrderedCallUs({
  sectionKey,
  settingsPrefix,
  settings,
  className,
}: {
  sectionKey: string
  /** Empty string → home-style `section.callus`. Otherwise `{prefix}.section.callus`. */
  settingsPrefix: string
  settings: SiteSettings
  className?: string
}) {
  if (!isCallusSectionKey(sectionKey)) return null
  const visKey = settingsPrefix
    ? `${settingsPrefix}.section.${sectionKey}`
    : `section.${sectionKey}`
  if (!isOn(settings, visKey)) return null
  return (
    <div key={sectionKey} className={className}>
      <CallUs
        title={settings["callus.title"]}
        subtitle={settings["callus.subtitle"]}
        button={settings["callus.button"]}
      />
    </div>
  )
}
