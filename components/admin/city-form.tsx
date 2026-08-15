"use client"

import { useActionState, useState } from "react"
import { Plus, Trash2 } from "lucide-react"
import { saveCityAction } from "@/app/admin/city-actions"
import type { CityDestination } from "@/lib/types"
import { RichEditor } from "@/components/admin/rich-editor"
import { FaqEditor, type FaqGroupState } from "@/components/admin/faq-editor"
import { AdminCombobox, type ComboboxOption } from "@/components/admin/combobox"
import { SlugField } from "@/components/admin/slug-field"
import {
  FormSection,
  FloatingSave,
  FormAnchorNav,
  Button,
  ButtonLink,
  Input,
  Select,
  Textarea,
  Label,
  IconButton,
} from "@/components/admin/ui"
import { useActionToast } from "@/components/admin/use-action-toast"
import { SettingMediaField } from "@/components/admin/setting-media-field"
import { aviaCityPageConfig, hotCityPageConfig } from "@/lib/admin-config"

const SECTIONS = [
  { id: "s-main", label: "Основное" },
  { id: "s-page-header", label: "Шапка страницы" },
  { id: "s-page-meta", label: "SEO и мета" },
  { id: "s-page-cities", label: "Карточки/другие курорты" },
  { id: "s-sections", label: "SEO-секции" },
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
        if (field.type === "media") {
          return (
            <div key={field.key} className="sm:col-span-2">
              <SettingMediaField name={field.key} label={field.label} value={settings[field.key]} required={field.required} />
              {field.hint && (
                <p className="mt-1 text-xs text-admin-fg-muted">{field.hint}</p>
              )}
            </div>
          )
        }
        return (
          <div key={field.key} className={isFullWidth ? "sm:col-span-2" : ""}>
            <Label htmlFor={`cf-${field.key}`} required={field.required}>{field.label}</Label>
            {field.type === "richtext" ? (
              <RichEditor
                name={field.key}
                defaultValue={settings[field.key] ?? ""}
                placeholder={field.placeholder ?? ""}
                required={field.required}
              />
            ) : field.type === "textarea" ? (
              <Textarea
                id={`cf-${field.key}`}
                name={field.key}
                defaultValue={settings[field.key] ?? ""}
                placeholder={field.placeholder ?? ""}
                rows={field.rows ?? 3}
                required={field.required}
              />
            ) : (
              <Input
                id={`cf-${field.key}`}
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

export function CityForm({
  city,
  faqs = [],
  faqGroups,
  defaultCategory = "bus",
  citiesTitle = "",
  countries = [],
  pageSettings = {},
}: {
  city?: CityDestination
  faqs?: FaqItem[]
  faqGroups?: FaqGroupState[]
  defaultCategory?: "bus" | "avia" | "hot"
  citiesTitle?: string
  countries?: ComboboxOption[]
  pageSettings?: Record<string, string>
}) {
  const isNew = !city
  const CREATE_SLUG_PLACEHOLDER = "__CITY_NEW__"
  const category = (city?.category ?? defaultCategory) as "bus" | "avia" | "hot"
  const liveSlug = city?.slug ?? CREATE_SLUG_PLACEHOLDER
  const pageConfig =
    category === "hot"
      ? hotCityPageConfig(liveSlug, city?.name ?? "")
      : aviaCityPageConfig(liveSlug, city?.name ?? "", category)
  const pageGroups = pageConfig.groups
  const headerGroup = pageGroups.find((g) => g.heading === "Шапка страницы")

  const [state, action, pending] = useActionState(saveCityAction, null)
  const [sections, setSections] = useState(
    city?.sections?.length ? city.sections : [{ title: "", body: [] as string[] }],
  )
  const [countryValue, setCountryValue] = useState(city?.country ?? "")
  useActionToast(state, { successMessage: isNew ? "Город создан" : "Город сохранён" })

  return (
    <div className="flex gap-6">
    <form action={action} className="min-w-0 flex-1 space-y-4">
      {city ? <input type="hidden" name="id" value={city.id} /> : null}
      <input type="hidden" name="category" value={category} />

      {state?.error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-admin-danger" role="alert">
          {state.error}
        </p>
      ) : null}

      {isNew && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          Все поля страницы доступны сразу — шапка, SEO, карточки других курортов и FAQ.
        </div>
      )}

      <FormSection id="s-main" title="Основное" collapsible={false}>
        <div className="space-y-4">
          <p className="text-xs text-admin-fg-muted">* — обязательные поля</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="city-name" required>Название города</Label>
              <Input id="city-name" name="name" defaultValue={city?.name} required placeholder="Санкт-Петербург" />
            </div>
            <SlugField
              id="city-slug"
              nameSourceId="city-name"
              defaultValue={city?.slug}
              autoFromName={!city}
              placeholder="sankt-peterburg"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Раздел (тип туров)</Label>
              <p className="rounded-md border border-admin-border bg-admin-muted/60 px-3 py-2 text-sm">
                {category === "bus" ? "Автобусные туры" : category === "avia" ? "Авиатуры" : "Горящие туры"}
              </p>
              <p className="mt-1 text-xs text-admin-fg-subtle">
                Раздел выбирается один раз при создании.
              </p>
            </div>
            <div>
              <Label htmlFor="country" required>Страна</Label>
              <AdminCombobox
                name="country"
                options={countries}
                value={countryValue}
                onChange={setCountryValue}
                placeholder="Выберите или введите страну…"
                hint="Город появится в сайдбаре выбранного раздела внутри этой страны."
                allowCreate
              />
            </div>
          </div>
          <div>
            <Label htmlFor="intro">Вступительный текст (в каталог направлений)</Label>
            <Textarea id="intro" name="intro" defaultValue={city?.intro} rows={4} />
          </div>
          <div>
            <Label htmlFor="citiesTitle">Заголовок блока «Другие курорты» (H2)</Label>
            <Input
              id="citiesTitle"
              name="citiesTitle"
              defaultValue={citiesTitle}
              placeholder={`Популярные курорты в (страна — подставится автоматически)`}
            />
            <p className="mt-1 text-xs text-admin-fg-subtle">
              Оставьте пустым — будет «Популярные курорты в [Страна]».
            </p>
          </div>
          {!city ? (
            <div className="space-y-4 border-t border-admin-border pt-4">
              <p className="text-sm font-medium text-admin-fg">Обязательные поля страницы</p>
              <div><Label htmlFor="city-h1" required>Заголовок H1</Label><Input id="city-h1" name="h1" required minLength={3} /></div>
              <div><Label htmlFor="city-page-intro" required>Вводный абзац страницы</Label><Textarea id="city-page-intro" name="intro" required minLength={12} rows={4} /></div>
              <div><Label htmlFor="city-meta-title" required>Title (SEO)</Label><Input id="city-meta-title" name="metaTitle" required /></div>
              <div><Label htmlFor="city-meta-description" required>Описание для поиска</Label><Textarea id="city-meta-description" name="metaDescription" required rows={3} /></div>
              <div><Label htmlFor="city-meta-short-desc" required>Превью описание</Label><Textarea id="city-meta-short-desc" name="metaShortDesc" required rows={2} /></div>
              <div><SettingMediaField name="metaImage" label="Превью изображение" required /></div>
            </div>
          ) : null}
        </div>
      </FormSection>

      {headerGroup && (
        <FormSection id="s-page-header" title={headerGroup.heading} collapsible={false}>
          <FieldsInForm fields={headerGroup.fields} settings={pageSettings} />
        </FormSection>
      )}

      {pageGroups
        .filter((g) => g.heading !== "Шапка страницы")
        .map((group) => {
          const sectionId =
            group.heading === "SEO и мета" ? "s-page-meta" :
            /другие курорты|карточки курортов|карточки направлений/i.test(group.heading) ? "s-page-cities" :
            `s-pg-${group.heading.replace(/\s+/g, "-")}`
          return (
            <FormSection key={group.heading} id={sectionId} title={group.heading} defaultOpen={group.heading === "SEO и мета"}>
              <FieldsInForm fields={group.fields} settings={pageSettings} />
            </FormSection>
          )
        })}

      <FormSection id="s-sections" title="SEO-секции" defaultOpen={false}>
        <div className="space-y-3">
          <div className="flex justify-end">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setSections((s) => [...s, { title: "", body: [] }])}
            >
              <Plus className="h-4 w-4" /> Секция
            </Button>
          </div>
          {sections.map((section, i) => (
            <div key={i} className="rounded-md border border-admin-border p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-admin-fg">Секция {i + 1}</span>
                <IconButton
                  type="button"
                  tone="danger"
                  onClick={() => setSections((s) => s.filter((_, idx) => idx !== i))}
                  aria-label="Удалить секцию"
                >
                  <Trash2 className="h-4 w-4" />
                </IconButton>
              </div>
              <Input
                name="sectionTitle"
                defaultValue={section.title}
                placeholder="Заголовок секции"
                className="mb-2"
              />
              <Textarea
                name="sectionBody"
                defaultValue={section.body.join("\n\n")}
                placeholder="Абзацы текста, разделённые пустой строкой"
                rows={4}
              />
            </div>
          ))}
          {sections.length === 0 ? (
            <p className="text-sm text-admin-fg-subtle">Секций нет. Добавьте секцию для SEO-текста страницы.</p>
          ) : null}
        </div>
      </FormSection>

      <FormSection id="s-faq" title="Частые вопросы (для этой страницы)" defaultOpen={false}>
        <FaqEditor items={faqs} groups={faqGroups} mode="groups" />
      </FormSection>

      <div className="flex gap-3 pb-20">
        <ButtonLink href="/admin/cities" variant="secondary">
          Отмена
        </ButtonLink>
      </div>

      <FloatingSave pending={pending} />
    </form>

    <FormAnchorNav sections={SECTIONS} />
    </div>
  )
}
