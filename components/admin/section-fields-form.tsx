"use client"

import { useActionState, useContext, useEffect, useState } from "react"
import { Check } from "lucide-react"
import { saveSettingsAction } from "@/app/admin/cms-actions"
import type { SettingField, SettingFieldOption } from "@/lib/admin-config"
import { Button, Input, Textarea, Label, Select } from "@/components/admin/ui"
import { RichEditor } from "@/components/admin/rich-editor"
import { SettingMediaField } from "@/components/admin/setting-media-field"
import { PageSettingsFormContext } from "@/components/admin/page-settings-form"
import { cn } from "@/lib/utils"
import { ShortcodeInput } from "@/components/admin/shortcode-input"
import { CaptchaConfigStatusButton } from "@/components/admin/captcha-config-status"
import type { CaptchaWiringStatus } from "@/lib/recaptcha"

const optionDotClass: Record<NonNullable<SettingFieldOption["tone"]>, string> = {
  info: "bg-blue-500",
  warning: "bg-amber-500",
  error: "bg-red-500",
  neutral: "bg-admin-fg-muted",
}

function SettingSelectField({
  field,
  value,
  form,
}: {
  field: SettingField
  value: string
  form?: string
}) {
  const options = field.options ?? []
  const initial = value || field.defaultValue || options[0]?.value || ""
  const [selected, setSelected] = useState(initial)
  const selectedTone = options.find((o) => o.value === selected)?.tone ?? "neutral"

  return (
    <div className="relative">
      <span
        className={cn(
          "pointer-events-none absolute left-3 top-1/2 z-10 h-2.5 w-2.5 -translate-y-1/2 rounded-full",
          optionDotClass[selectedTone],
        )}
        aria-hidden
      />
      <Select
        id={`sf-${field.key}`}
        name={field.key}
        form={form}
        value={selected}
        onChange={(event) => setSelected(event.target.value)}
        required={field.required}
        className="pl-8"
        aria-label={field.label}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.tone === "info"
              ? `● ${option.label}`
              : option.tone === "warning"
                ? `▲ ${option.label}`
                : option.label}
          </option>
        ))}
      </Select>
    </div>
  )
}

/**
 * SectionFieldsForm — a standalone save-form for a single section's fields.
 *
 * Each section on the page editor gets its own form so that saving one section
 * doesn't require re-submitting the entire page. The form calls
 * saveSettingsAction directly (same action used by SettingsForm).
 *
 * Supports field types: "text" (default), "textarea" (multi-line, configurable rows),
 * "richtext" (Tiptap WYSIWYG editor outputting HTML), "select", "media".
 */
/** Fields-only rendering (no <form>, no submit button) — used inside a parent form */
export function FieldsGrid({
  fields,
  settings,
  form,
  captchaWiring,
}: {
  fields: SettingField[]
  settings: Record<string, string>
  /** Associate controls with an external &lt;form id&gt; (workspaceBeforeForm panels). */
  form?: string
  /** DEV admin: show captcha env wiring next to `site.captchaStatusVisible`. */
  captchaWiring?: CaptchaWiringStatus
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {fields.map((field) => {
        const isShortcodeMultiline = field.type === "shortcode-textarea-multiline"
        const publicIntroMinLength = /\.intro$/.test(field.key) ? 12 : undefined
        const isShortcodeField =
          field.type === "shortcode-input" ||
          field.type === "shortcode-textarea" ||
          isShortcodeMultiline
        const isFullWidth =
          field.type === "textarea" ||
          field.type === "shortcode-textarea" ||
          isShortcodeMultiline ||
          field.type === "richtext" ||
          field.type === "media" ||
          field.key === "site.captchaStatusVisible"
        return (
          <div key={field.key} className={isFullWidth ? "sm:col-span-2" : ""}>
            {field.type === "media" ? (
              <SettingMediaField
                name={field.key}
                label={field.label}
                value={settings[field.key] ?? ""}
                required={field.required}
                form={form}
                accept={field.mediaAccept}
              />
            ) : (
              <>
                <Label htmlFor={`sf-${field.key}`} required={field.required}>{field.label}</Label>

                {field.type === "richtext" ? (
                  <RichEditor
                    name={field.key}
                    defaultValue={settings[field.key] ?? ""}
                    placeholder={field.placeholder ?? ""}
                    required={field.required}
                    form={form}
                    collapseEmpty={field.collapseEmpty}
                  />
                ) : isShortcodeField ? (
                  <ShortcodeInput
                    id={`sf-${field.key}`}
                    label={field.label}
                    name={field.key}
                    form={form}
                    defaultValue={settings[field.key] ?? ""}
                    placeholder={field.placeholder ?? ""}
                    multiline={isShortcodeMultiline}
                    rows={field.rows ?? (isShortcodeMultiline ? 8 : undefined)}
                    required={field.required}
                  />
                ) : field.type === "textarea" ? (
                  <Textarea
                    id={`sf-${field.key}`}
                    name={field.key}
                    form={form}
                    defaultValue={settings[field.key] ?? ""}
                    placeholder={field.placeholder ?? ""}
                    rows={field.rows ?? 3}
                    required={field.required}
                    minLength={publicIntroMinLength}
                  />
                ) : field.type === "select" ? (
                  <SettingSelectField
                    field={field}
                    value={settings[field.key] ?? ""}
                    form={form}
                  />
                ) : field.type === "date" ? (
                  <Input
                    id={`sf-${field.key}`}
                    type="date"
                    name={field.key}
                    form={form}
                    defaultValue={settings[field.key] ?? ""}
                    required={field.required}
                  />
                ) : (
                  <Input
                    id={`sf-${field.key}`}
                    name={field.key}
                    form={form}
                    defaultValue={settings[field.key] ?? ""}
                    placeholder={field.placeholder ?? ""}
                    required={field.required}
                    minLength={publicIntroMinLength}
                  />
                )}

                {field.hint && (
                  <p className="mt-1 text-xs text-admin-fg-muted">
                    {field.hint}
                  </p>
                )}
                {field.key === "site.captchaStatusVisible" && captchaWiring ? (
                  <CaptchaConfigStatusButton wiring={captchaWiring} />
                ) : null}
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}

export function SectionFieldsForm({
  fields,
  settings,
  hideSubmit,
}: {
  fields: SettingField[]
  settings: Record<string, string>
  /** When true, renders only the fields without a <form> wrapper or submit button.
   *  Use inside a parent form that has its own submit button. */
  hideSubmit?: boolean
}) {
  const [state, action, pending] = useActionState(saveSettingsAction, null)
  const [saved, setSaved] = useState(false)
  const pageForm = useContext(PageSettingsFormContext)

  useEffect(() => {
    if (state && "ok" in state && state.ok) {
      setSaved(true)
      const t = setTimeout(() => setSaved(false), 2500)
      return () => clearTimeout(t)
    }
  }, [state])

  // Inside PageSettingsForm: join sticky Save via HTML form= (one FormData, no parallel race).
  if (pageForm && !hideSubmit) {
    return <FieldsGrid fields={fields} settings={settings} form={pageForm.formId} />
  }

  // Standalone mode: own <form> with its own submit button
  if (!hideSubmit) {
    return (
      <form action={action} className="space-y-4">
        <input type="hidden" name="__toggles" value="" />
        <FieldsGrid fields={fields} settings={settings} />
        <div className="flex items-center gap-3 pt-1">
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Сохранение…" : "Сохранить"}
          </Button>
          {saved && (
            <span className="flex items-center gap-1 text-xs text-green-700">
              <Check className="h-3.5 w-3.5" /> Сохранено
            </span>
          )}
        </div>
      </form>
    )
  }

  // Embedded mode: fields inside or outside parent <form> — always bind via formId when in page shell
  return <FieldsGrid fields={fields} settings={settings} form={pageForm?.formId} />
}
