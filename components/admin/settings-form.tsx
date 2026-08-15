"use client"

import { useActionState, useEffect, useState } from "react"
import { Check, ChevronDown } from "lucide-react"
import { settingsGroups, sectionToggles } from "@/lib/admin-config"
import type { SettingsGroup } from "@/lib/admin-config"
import type { SiteSettings } from "@/lib/types"
import { saveSettingsAction } from "@/app/admin/cms-actions"
import { Button, Card, CardHeader, CardTitle, CardBody } from "@/components/admin/ui"
import { FieldsGrid } from "@/components/admin/section-fields-form"
import { cn } from "@/lib/utils"
import { SocialLinksEditor } from "@/components/admin/social-links-editor"
import type { CaptchaWiringStatus } from "@/lib/recaptcha"
import { EditorWorkspace } from "@/components/admin/editor-workspace"
import { useAdminDirtyForm } from "@/components/admin/use-admin-dirty-form"

function filterCaptchaStatusField(groups: SettingsGroup[], show: boolean): SettingsGroup[] {
  if (show) return groups
  return groups
    .map((group) => ({
      ...group,
      fields: group.fields.filter((f) => f.key !== "site.captchaStatusVisible"),
    }))
    .filter((group) => group.fields.length > 0)
}

function settingsGroupStorageKey(heading: string) {
  return `admin:settings-group:${heading}`
}

function settingsGroupBodyId(heading: string) {
  return `settings-group-${heading.replace(/[^a-zA-Zа-яА-Я0-9]+/g, "-").replace(/^-|-$/g, "")}`
}

function CollapsibleSettingsGroup({
  group,
  settings,
  captchaWiring,
}: {
  group: SettingsGroup
  settings: SiteSettings
  captchaWiring?: CaptchaWiringStatus
}) {
  const [open, setOpen] = useState(true)
  const bodyId = settingsGroupBodyId(group.heading)
  const analyticsHeadings: Record<string, string> = {
    "analytics.ymCounterId": "Яндекс.Метрика",
    "analytics.gtmId": "Google",
    "analytics.goalLeadSuccess": "Настройка целей",
  }

  useEffect(() => {
    try {
      setOpen(window.sessionStorage.getItem(settingsGroupStorageKey(group.heading)) !== "0")
    } catch {
      setOpen(true)
    }
  }, [group.heading])

  function toggle() {
    setOpen((prev) => {
      const next = !prev
      try {
        window.sessionStorage.setItem(settingsGroupStorageKey(group.heading), next ? "1" : "0")
      } catch {}
      return next
    })
  }

  return (
    <Card>
      <CardHeader className="p-0">
        <button
          type="button"
          onClick={toggle}
          className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-ring focus-visible:ring-offset-1"
          aria-expanded={open}
          aria-controls={bodyId}
        >
          <CardTitle>{group.heading}</CardTitle>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-admin-fg-subtle transition-transform duration-150",
              open ? "rotate-180" : "rotate-0",
            )}
            aria-hidden
          />
        </button>
      </CardHeader>
      {open ? (
        <CardBody id={bodyId} className="space-y-4">
          {group.description ? (
            <p className="-mt-1 text-sm text-admin-fg-muted">{group.description}</p>
          ) : null}
          {group.heading === "Веб-аналитика и цели" ? (
            <div className="space-y-5">
              {group.fields.map((field, index) => (
                <div key={field.key} className="space-y-3">
                  {analyticsHeadings[field.key] ? (
                    <h3 className={cn("text-sm font-semibold text-admin-fg", index > 0 && "border-t border-admin-border pt-5")}>
                      {analyticsHeadings[field.key]}
                    </h3>
                  ) : null}
                  <FieldsGrid fields={[field]} settings={settings} captchaWiring={captchaWiring} />
                </div>
              ))}
            </div>
          ) : (
            <FieldsGrid
              fields={group.fields}
              settings={settings}
              captchaWiring={captchaWiring}
            />
          )}
          {group.help ? (
            <aside className="rounded-lg border border-admin-border bg-admin-bg-subtle p-4 text-sm leading-relaxed text-admin-fg-muted">
              {group.help}
            </aside>
          ) : null}
        </CardBody>
      ) : null}
    </Card>
  )
}

export function SettingsForm({
  settings,
  groups: groupsOverride,
  hideToggles = true,
  showCaptchaStatusSetting = false,
  captchaWiring,
}: {
  settings: SiteSettings
  groups?: SettingsGroup[]
  hideToggles?: boolean
  /** Only on DEV stand (`BASTUR_DEPLOY_ENV=dev`). */
  showCaptchaStatusSetting?: boolean
  captchaWiring?: CaptchaWiringStatus
}) {
  const [state, action, pending] = useActionState(saveSettingsAction, null)
  const [saved, setSaved] = useState(false)
  const { markClean, formInputHandlers } = useAdminDirtyForm({
    id: "site-settings",
    label: "Настройки сайта",
  })

  useEffect(() => {
    if (state && "ok" in state && state.ok) {
      markClean()
      setSaved(true)
      const t = setTimeout(() => setSaved(false), 2500)
      return () => clearTimeout(t)
    }
  }, [state, markClean])

  const activeGroups = filterCaptchaStatusField(
    groupsOverride ?? settingsGroups,
    showCaptchaStatusSetting,
  )
  const toggleKeys = sectionToggles.map((t) => t.key).join(",")
  const analyticsGroup = activeGroups.find((group) => group.heading === "Веб-аналитика и цели")
  const mainGroups = activeGroups.filter((group) => group !== analyticsGroup)

  return (
    <form action={action} className="space-y-6" {...formInputHandlers()}>
      {!groupsOverride ? <input type="hidden" name="__siteSettings" value="1" /> : null}
      <input type="hidden" name="__toggles" value={toggleKeys} />

      <EditorWorkspace
        groups={[
          { id: "main", label: "Основные настройки", badge: true, anchorIds: ["settings-main"] },
          { id: "analytics", label: "Веб-аналитика и цели", badge: Boolean(settings["analytics.ymCounterId"] || settings["analytics.gtmId"] || settings["analytics.gaMeasurementId"]), anchorIds: ["settings-analytics"] },
        ]}
      >
        <div id="settings-main" className="space-y-6">
          {!hideToggles ? (
            <Card>
              <CardHeader><CardTitle>Секции главной страницы</CardTitle></CardHeader>
              <CardBody className="divide-y divide-admin-border">
                {sectionToggles.map((t) => (
                  <label key={t.key} className="flex cursor-pointer items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                    <span>
                      <span className="block text-sm font-medium text-admin-fg">{t.label}</span>
                      <span className="block text-xs text-admin-fg-muted">{t.hint}</span>
                    </span>
                    <input type="checkbox" name={t.key} defaultChecked={(settings[t.key] ?? "1") === "1"} className="h-5 w-5 shrink-0 rounded border-admin-border accent-admin-fg" />
                  </label>
                ))}
              </CardBody>
            </Card>
          ) : null}
          {mainGroups.map((group) => (
            <CollapsibleSettingsGroup key={group.heading} group={group} settings={settings} captchaWiring={showCaptchaStatusSetting ? captchaWiring : undefined} />
          ))}
          {!groupsOverride ? <SocialLinksEditor settings={settings} /> : null}
        </div>
        <div id="settings-analytics">
          {analyticsGroup ? <CollapsibleSettingsGroup group={analyticsGroup} settings={settings} /> : null}
        </div>
      </EditorWorkspace>

      <div className="sticky bottom-4 z-10 flex items-center gap-3 rounded-lg border border-admin-border bg-white/90 p-3 shadow-sm backdrop-blur">
        <Button type="submit" disabled={pending}>
          {pending ? "Сохранение…" : "Сохранить изменения"}
        </Button>
        {saved ? (
          <span className="inline-flex items-center gap-1 text-sm text-emerald-600">
            <Check className="h-4 w-4" /> Сохранено
          </span>
        ) : null}
      </div>
    </form>
  )
}
