"use client"

import { useActionState } from "react"
import { saveCountryAction } from "@/app/admin/country-actions"
import type { Country } from "@/lib/types"
import { RichEditor } from "@/components/admin/rich-editor"
import { FaqEditor, type FaqGroupState } from "@/components/admin/faq-editor"
import {
  FormSection,
  FloatingSave,
  FormAnchorNav,
  ButtonLink,
  Input,
  Textarea,
  Label,
} from "@/components/admin/ui"
import { aviaCountryPageGroups } from "@/lib/admin-config"
import { SlugField } from "@/components/admin/slug-field"
import { SettingMediaField } from "@/components/admin/setting-media-field"
import { useActionToast } from "@/components/admin/use-action-toast"

const BASE_SECTIONS = [
  { id: "s-main", label: "Основное" },
  { id: "s-page-meta", label: "SEO и мета" },
  { id: "s-page-cities", label: "Карточки курортов" },
  { id: "s-page-seo", label: "SEO-текст" },
  { id: "s-faq", label: "FAQ" },
]

type FaqItem = { question: string; answer: string }

function FieldsInForm({
  fields,
  settings,
}: {
  fields: { key: string; label: string; type?: string; placeholder?: string; hint?: string; rows?: number; required?: boolean }[]
  settings: Record<string, string>
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {fields.map((field) => {
        const isFullWidth = field.type === "textarea" || field.type === "richtext"
        return (
          <div key={field.key} className={isFullWidth ? "sm:col-span-2" : ""}>
            <Label htmlFor={`f-${field.key}`} required={field.required}>{field.label}</Label>
            {field.type === "richtext" ? (
              <RichEditor
                name={field.key}
                defaultValue={settings[field.key] ?? ""}
                placeholder={field.placeholder ?? ""}
                required={field.required}
              />
            ) : field.type === "textarea" ? (
              <Textarea
                id={`f-${field.key}`}
                name={field.key}
                defaultValue={settings[field.key] ?? ""}
                placeholder={field.placeholder ?? ""}
                rows={field.rows ?? 3}
                required={field.required}
              />
            ) : (
              <Input
                id={`f-${field.key}`}
                name={field.key}
                defaultValue={settings[field.key] ?? ""}
                placeholder={field.placeholder ?? ""}
                required={field.required}
              />
            )}
            {field.hint && (
              <p className="mt-1 text-xs text-admin-fg-muted">{field.hint}</p>
            )}
          </div>
        )
      })}
    </div>
  )
}

export function CountryForm({
  country,
  faqs = [],
  faqGroups,
  pageSettings = {},
  category = "bus",
}: {
  country?: Country
  faqs?: FaqItem[]
  faqGroups?: FaqGroupState[]
  /** Rich page settings loaded from the settings table (country:{category}:{slug}.*) */
  pageSettings?: Record<string, string>
  /** Category for new countries — passed from the ?category= URL param */
  category?: "bus" | "avia" | "hot"
}) {
  const [state, action, pending] = useActionState(saveCountryAction, null)
  useActionToast(state, { successMessage: country ? "Страна сохранена" : "Страна создана" })

  // Page-template groups: when editing use real slug; for create use a placeholder
  // that server-side saveCountryAction rewrites to the actual slug before persisting.
  const CREATE_SLUG_PLACEHOLDER = "__COUNTRY_NEW__"
  const pageGroups = country
    ? aviaCountryPageGroups(country.slug, country.category)
    : aviaCountryPageGroups(CREATE_SLUG_PLACEHOLDER, category)
  const headerGroup = pageGroups.find((group) => group.heading === "Шапка страницы")
  const otherPageGroups = pageGroups.filter((group) => group.heading !== "Шапка страницы")

  return (
    <div className="flex gap-6">
      <form action={action} className="min-w-0 flex-1 space-y-4">
        {country ? <input type="hidden" name="id" value={country.id} /> : null}
        <input type="hidden" name="category" value={country?.category ?? category} />

        {state?.error ? (
          <div
            className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-admin-danger"
            role="alert"
          >
            <p>{state.error}</p>
          </div>
        ) : null}
        <p className="text-xs text-admin-fg-muted">* — обязательные поля</p>

        {/* ── Основное ──────────────────────────────────────── */}
        <FormSection id="s-main" title="Основное">
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="country-name" required>Название страны</Label>
                <Input
                  id="country-name"
                  name="name"
                  defaultValue={country?.name}
                  required
                  placeholder="Турция"
                />
              </div>
              <SlugField
                nameSourceId="country-name"
                defaultValue={country?.slug}
                autoFromName={!country}
                placeholder="turciya"
              />
            </div>
            {!country ? (
              <div className="space-y-4 border-t border-admin-border pt-4">
                <p className="text-sm font-medium text-admin-fg">Обязательные поля страницы</p>
                <div><Label htmlFor="country-h1" required>Заголовок H1</Label><Input id="country-h1" name="h1" required minLength={3} /></div>
                <div><Label htmlFor="country-intro" required>Вводный абзац</Label><Textarea id="country-intro" name="intro" required minLength={12} rows={4} /></div>
                <div><Label htmlFor="country-meta-title" required>Title (SEO)</Label><Input id="country-meta-title" name="metaTitle" required /></div>
                <div><Label htmlFor="country-meta-description" required>Описание для поиска</Label><Textarea id="country-meta-description" name="metaDescription" required rows={3} /></div>
                <div><Label htmlFor="country-meta-short-desc" required>Превью описание</Label><Textarea id="country-meta-short-desc" name="metaShortDesc" required rows={2} /></div>
                <div><SettingMediaField name="metaImage" label="Превью изображение" required /></div>
                <p className="text-xs text-admin-fg-muted">FAQ, таблица и другие необязательные секции доступны после первого создания.</p>
              </div>
            ) : null}            {headerGroup ? (
              <div className="space-y-3 border-t border-admin-border pt-4">
                <p className="text-sm font-medium text-admin-fg">Шапка страницы</p>
                <FieldsInForm fields={headerGroup.fields} settings={pageSettings} />
              </div>
            ) : null}
          </div>
        </FormSection>

        {/* ── Page template sections (only for existing countries) ── */}
        {otherPageGroups.map((group) => {
          const sectionId =
            group.heading === "SEO и мета"
              ? "s-page-meta"
              : group.heading === "Секция «Карточки курортов»"
                  ? "s-page-cities"
                  : "s-page-seo"
          return (
            <FormSection key={group.heading} id={sectionId} title={group.heading} defaultOpen={false}>
              <FieldsInForm fields={group.fields} settings={pageSettings} />
            </FormSection>
          )
        })}

        {/* ── FAQ — только при редактировании ─────────────── */}
        {country ? (
          <FormSection id="s-faq" title="Частые вопросы (для этой страницы)" defaultOpen={false}>
            <FaqEditor items={faqs} groups={faqGroups} mode="groups" />
          </FormSection>
        ) : null}

        <div className="flex gap-3 pb-20">
          <ButtonLink href="/admin/countries" variant="secondary">
            Отмена
          </ButtonLink>
        </div>

        <FloatingSave pending={pending} />
      </form>

      <FormAnchorNav sections={country ? BASE_SECTIONS : [{ id: "s-main", label: "Основное и обязательные поля" }]} />
    </div>
  )
}
