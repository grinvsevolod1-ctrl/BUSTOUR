"use client"

import { useActionState, useEffect, useState, useTransition } from "react"
import { Check, ChevronDown, ExternalLink, Eye, EyeOff, Plus, RotateCcw, Save, Trash2 } from "lucide-react"
import Link from "next/link"
import { useAdminDirtyForm } from "@/components/admin/use-admin-dirty-form"
import { useGuardedRouter } from "@/components/admin/use-guarded-router"
import { toast } from "sonner"
import { saveTourAction } from "@/app/admin/actions"
import { saveSettingsAction } from "@/app/admin/cms-actions"
import type { Tour, Country, CityDestination, Currency, TourSection, TourSectionKey } from "@/lib/types"
import { useActionToast } from "@/components/admin/use-action-toast"
import { RichEditor } from "@/components/admin/rich-editor"
import { SettingMediaField } from "@/components/admin/setting-media-field"
import { FaqEditor, type FaqGroupState } from "@/components/admin/faq-editor"
import { WhatIncludedBuilder } from "@/components/admin/what-included-builder"
import { GalleryBuilder } from "@/components/admin/gallery-builder"
import { TourCoverBuilder } from "@/components/admin/tour-cover-builder"
import { TourAdditionalBlock } from "@/components/admin/tour-additional-block"
import { FieldsGrid } from "@/components/admin/section-fields-form"
import { pageAlertFields, SEO_META_DESCRIPTION_HINT, SEO_META_DESCRIPTION_LABEL, SEO_META_SHORT_DESC_HINT, SEO_META_SHORT_DESC_LABEL } from "@/lib/admin-config"
import { DocumentsBuilder } from "@/components/admin/documents-builder"
import { TourLayoutBuilder } from "@/components/admin/tour-layout-builder"
import { AdminCombobox } from "@/components/admin/combobox"
import { SlugField } from "@/components/admin/slug-field"
import {
  FormSection,
  Button,
  ButtonLink,
  Input,
  Textarea,
  Select,
  Label,
  IconButton,
  Alert,
} from "@/components/admin/ui"
import { EditorWorkspace, type EditorWorkspaceGroup } from "@/components/admin/editor-workspace"
import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { cn } from "@/lib/utils"
import { tourUrl } from "@/lib/tour-url"
import { resolveTourLayout } from "@/lib/tour-sections"
import { ShortcodeInput } from "@/components/admin/shortcode-input"

type FaqItem = { question: string; answer: string }

export function TourForm({
  tour,
  countries = [],
  cities = [],
  currencies = [],
  tourTypes = [],
  faqs = [],
  faqGroups,
  arrivalCityName = "",
  tourVisible = true,
  tourMeta = {},
}: {
  tour?: Tour
  countries?: Country[]
  cities?: CityDestination[]
  currencies?: Currency[]
  tourTypes?: string[]
  faqs?: FaqItem[]
  faqGroups?: FaqGroupState[]
  arrivalCityName?: string
  tourVisible?: boolean
  tourMeta?: Record<string, string>
}) {
  const [state, action, pending] = useActionState(saveTourAction, null)
  const [saved, setSaved] = useState(false)
  const [visible, setVisible] = useState(tourVisible)
  const [datesConfirm, setDatesConfirm] = useState(false)
  const [visTogglePending, startVisToggle] = useTransition()
  const router = useGuardedRouter()
  const { markDirty, markClean, formInputHandlers } = useAdminDirtyForm({
    id: tour ? `tour-${tour.id}` : "tour-new",
    label: tour ? `Тур: ${tour.title || `#${tour.id}`}` : "Новый тур",
  })
  useEffect(() => {
    if (state?.success) markClean()
  }, [state?.success, markClean])
  const [layout, setLayout] = useState<TourSection[]>(() => resolveTourLayout(tour?.layout))
  const layoutKeys = new Set(layout.map((s) => s.key))
  const showSection = (key: TourSectionKey) => layoutKeys.has(key)
  const [program, setProgram] = useState<
    { dayStart?: number; dayEnd?: number; customTitle?: string; text: string }[]
  >(() => {
    if (tour?.program?.length) {
      return tour.program.map((p) => {
        // Backward compat: structured ranges win; legacy display titles remain readable.
        const title = p.day.trim()
        const range = title.match(/^Дни?\s+(\d+)\s*[–—-]\s*(\d+)\s*$/i)
        const single = title.match(/^День\s+(\d+)\s*$/i)
        const legacy = range
          ? { dayStart: Number(range[1]), dayEnd: Number(range[2]), customTitle: undefined }
          : single
            ? { dayStart: Number(single[1]), dayEnd: undefined, customTitle: undefined }
            : { dayStart: undefined, dayEnd: undefined, customTitle: title }
        return { dayStart: p.dayStart ?? legacy.dayStart, dayEnd: p.dayEnd ?? legacy.dayEnd, customTitle: legacy.customTitle, text: p.text }
      })
    }
    return [{ dayStart: 1, dayEnd: undefined, customTitle: undefined, text: "" }]
  })

  function updateProgram(
    index: number,
    patch: Partial<{ dayStart?: number; dayEnd?: number; customTitle?: string; text: string }>,
  ) {
    setProgram((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item))
    markDirty()
  }
  function autoProgramTitle(b: { dayStart?: number; dayEnd?: number; customTitle?: string }) {
    if (b.customTitle && b.customTitle.trim()) return b.customTitle.trim()
    const a = b.dayStart
    const b_ = b.dayEnd
    if (a != null && b_ != null && !Number.isNaN(a) && !Number.isNaN(b_)) {
      if (a === b_) return `День ${a}`
      const [x, y] = a < b_ ? [a, b_] : [b_, a]
      return `Дни ${x}–${y}`
    }
    if (a != null && !Number.isNaN(a)) return `День ${a}`
    return "Без номера"
  }

  // Combobox state for country and arrival city
  const [selectedCountryId, setSelectedCountryId] = useState<number | undefined>(tour?.countryId || undefined)
  const [selectedCityId, setSelectedCityId] = useState<number | undefined>(tour?.arrivalCityId || undefined)
  const [selectedCountry, setSelectedCountry] = useState(tour?.country ?? "")
  const [selectedCity, setSelectedCity] = useState(arrivalCityName ?? "")

  // Resolve selected country row by name (for FK-based filtering)
  const selectedCountryRow = countries.find((c) => c.id === selectedCountryId)

  // Filter cities to those matching the selected country by countryId (FK)
  const filteredCities = selectedCountryRow
    ? cities.filter((c) => c.countryId === selectedCountryRow.id)
    : []
  const countryHasNoCities = Boolean(selectedCountryRow && filteredCities.length === 0)

  const baseCurrency = currencies.find((c) => c.isBase) ?? currencies[0]
  const pageHref = tour
    ? tourUrl({
        tourSlug: tour.slug,
        countrySlug: tour.countrySlug,
        citySlug: tour.citySlug,
      }) ?? undefined
    : undefined

  useEffect(() => {
    if (state?.success) {
      setSaved(true)
      const timeout = setTimeout(() => setSaved(false), 3000)
      return () => clearTimeout(timeout)
    }
  }, [state])

  useActionToast(state, { successMessage: tour ? "Тур сохранён" : "Тур создан" })

  function toggleVisibility() {
    if (!tour) return
    const prev = visible
    const next = !visible
    setVisible(next)
    startVisToggle(async () => {
      const fd = new FormData()
      fd.set(`tour:${tour.slug}.visible`, next ? "1" : "0")
      const result = await saveSettingsAction(null, fd)
      if (result && "error" in result) {
        setVisible(prev)
        toast.error(`Не удалось изменить видимость: ${String(result.error)}`)
        return
      }
      toast.success(next ? "Тур опубликован" : "Тур скрыт")
    })
  }

  // ponytail: completeness is intentionally static from the initial tour payload; live field tracking is out of scope.
  const workspaceGroups: EditorWorkspaceGroup[] = [
    {
      id: "main",
      label: "Основное",
      badge: Boolean(tour && (tour.title || tour.description || tour.country || tour.citySlug || tour.alertText)),
      anchorIds: ["s-main", "s-alert"],
    },
    {
      id: "content",
      label: "Контент",
      badge: Boolean(
        tour &&
          (tour.gallery.length ||
            tour.whatIncluded.length ||
            tour.program.length ||
            tour.documents.length ||
            faqs.length),
      ),
      anchorIds: ["s-gallery", "s-included", "s-program", "s-docs", "s-faq"],
    },
    {
      id: "layout",
      label: "Порядок блоков",
      badge: Boolean(tour?.layout.length),
      anchorIds: ["s-layout"],
    },
    {
      id: "dates",
      label: "Даты и цены",
      badge: Boolean(tour?.datesTable.rows.length),
      anchorIds: ["s-dates"],
    },
    {
      id: "seo",
      label: "SEO",
      badge: Boolean(tour && (tour.seoTitle || tour.seoHtml)),
      anchorIds: ["s-seo-meta", "s-seo"],
    },
  ]

  return (
    <div>
      <div className={cn(
        "sticky top-0 z-40 -mx-4 mb-6 border-b bg-white/95 px-4 shadow-sm backdrop-blur-sm md:-mx-8 md:px-8 lg:-mx-10 lg:px-10",
        tour && !visible ? "border-amber-200 bg-amber-50/95" : "border-admin-border",
      )}>
        <div className="flex flex-wrap items-center justify-between gap-3 py-3">
          <div className="min-w-0 flex items-center gap-2">
            <h1 className="truncate text-base font-semibold text-admin-fg">
              {tour ? `Редактирование: ${tour.title}` : "Новый тур"}
            </h1>
            {tour && (
              <span className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium",
                visible ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700",
              )}>
                {visible ? "Опубликована" : "Скрыта"}
              </span>
            )}
          </div>

          <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
            {saved && (
              <span className="flex items-center gap-1 text-xs text-green-700">
                <Check className="h-3.5 w-3.5" />
                Сохранено
              </span>
            )}
            {state?.error && <span className="text-xs text-red-500">{String(state.error)}</span>}

            {tour && (
              <button
                type="button"
                onClick={toggleVisibility}
                disabled={visTogglePending}
                title={visible ? "Скрыть страницу (404 для посетителей)" : "Опубликовать страницу"}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-40",
                  visible
                    ? "border-admin-border text-admin-fg-muted hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700"
                    : "border-green-300 bg-green-50 text-green-700 hover:bg-green-100",
                )}
              >
                {visible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                {visible ? "Скрыть" : "Опубликовать"}
              </button>
            )}

            {pageHref && (
              <Link
                href={pageHref}
                target="_blank"
                className="inline-flex items-center gap-1.5 rounded-md border border-admin-border px-2.5 py-1.5 text-xs text-admin-fg-muted transition-colors hover:bg-admin-muted hover:text-admin-fg"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Открыть
              </Link>
            )}

            <ButtonLink href="/admin/tours" variant="secondary">
              <RotateCcw className="h-3.5 w-3.5" />
              Отмена
            </ButtonLink>

            <Button type="submit" form="tour-form" size="sm" disabled={pending} className="gap-1.5">
              <Save className="h-3.5 w-3.5" />
              {pending ? "Сохранение…" : "Сохранить"}
            </Button>
          </div>
        </div>
      </div>

      <form id="tour-form" action={action} className="space-y-4" {...formInputHandlers()}>
      {tour ? <input type="hidden" name="id" value={tour.id} /> : null}

      {state?.error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-admin-danger" role="alert">
          {state.error}
        </p>
      ) : null}

      <EditorWorkspace groups={workspaceGroups}>
      <>
      <FormSection id="s-main" title="Основное">
        <div className="max-w-3xl space-y-4">
          <p className="text-xs text-admin-fg-muted">* — обязательные поля</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="tour-title" required>Название</Label>
              <ShortcodeInput id="tour-title" name="title" label="Название" defaultValue={tour?.title} required />
            </div>
            <SlugField
              id="tour-slug"
              nameSourceId="tour-title"
              defaultValue={tour?.slug}
              autoFromName={!tour}
              placeholder="tur-v-kareliyu"
            />
          </div>
          <div>
            <Label htmlFor="description" required>Описание</Label>
            <ShortcodeInput
              id="description"
              name="description"
              label="Описание"
              defaultValue={tour?.description}
              rows={3}
              multiline
              required
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label required>Страна</Label>
              <AdminCombobox
                name="country"
                valueIdName="countryId"
                valueId={selectedCountryId}
                options={countries.map((c) => ({ id: c.id, name: c.name }))}
                value={selectedCountry}
                allowCreate={false}
                required
                onChange={(v, id) => {
                  setSelectedCountry(v)
                  setSelectedCountryId(id)
                  // Reset city if it no longer belongs to the new country (by countryId FK)
                  const nextCountryRow = countries.find((c) => c.id === id)
                  const stillValid = nextCountryRow
                    ? cities.some(
                        (c) =>
                          c.name.trim().toLowerCase() === selectedCity.trim().toLowerCase() &&
                          c.countryId === nextCountryRow.id,
                      )
                    : true
                  if (!stillValid) {
                    setSelectedCity("")
                    setSelectedCityId(undefined)
                  }
                }}
                placeholder="Выберите страну"
                hint="Выберите страну из списка (только автобусные)."
              />
            </div>
            <div>
              <Label required>Город прибытия</Label>
              <AdminCombobox
                name="arrivalCity"
                valueIdName="arrivalCityId"
                valueId={selectedCityId}
                options={filteredCities.map((c) => ({ id: c.id, name: c.name }))}
                value={selectedCity}
                onChange={(value, id) => {
                  setSelectedCity(value)
                  setSelectedCityId(id)
                }}
                allowCreate={false}
                required
                placeholder={countryHasNoCities ? "В выбранной стране нет городов" : "Выберите город"}
                hint={
                  selectedCountry.trim()
                    ? `Выберите город из списка страны «${selectedCountry}» (только автобусные).`
                    : "Сначала выберите страну для фильтрации городов."
                }
              />
              {countryHasNoCities && (
                <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
                  <p className="text-sm text-amber-800">
                    В стране «{selectedCountry}» пока нет городов.
                  </p>
                  <Link
                    href={`/admin/cities/new?category=bus&countryId=${selectedCountryRow?.id ?? ""}&country=${encodeURIComponent(selectedCountry)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-amber-900 hover:text-amber-950 hover:underline"
                  >
                    <Plus className="h-4 w-4" /> Создать город для «{selectedCountry}»
                    <ExternalLink className="h-3.5 w-3.5 opacity-70" />
                  </Link>
                </div>
              )}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="departure">Отправление</Label>
              <Input id="departure" name="departure" defaultValue={tour?.departure} placeholder="Минск" />
            </div>
            <div>
              <Label htmlFor="tourType">Тип тура</Label>
              <Select id="tourType" name="tourType" defaultValue={tour?.tourType || ""}>
                <option value="">— не указан —</option>
                {tour?.tourType && !tourTypes.includes(tour.tourType) ? (
                  <option value={tour.tourType}>{tour.tourType}</option>
                ) : null}
                {tourTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div>
            <TourCoverBuilder image={tour?.image} cover={tour?.cover} required />
          </div>
          <div id="s-alert">
            <FieldsGrid
              fields={pageAlertFields("")}
              settings={{
                alertText: tour?.alertText ?? "",
                alertType: tour?.alertType ?? "info",
              }}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-admin-fg">
            <input
              type="checkbox"
              name="featured"
              defaultChecked={tour?.featured}
              className="h-4 w-4 rounded border-admin-border accent-admin-fg"
            />
            Показывать на главной (лучшие предложения)
          </label>
          <TourAdditionalBlock
            tourId={tour?.id}
            datesTable={tour?.datesTable}
            priceAmount={tour?.priceAmount}
            extraPriceAmount={tour?.extraPriceAmount}
            extraPriceCurrency={tour?.extraPriceCurrency}
            datesCurrency={tour?.datesCurrency || baseCurrency?.code}
            duration={tour?.duration}
            nights={tour?.nights}
            currencyCode={baseCurrency?.code}
            currencies={currencies}
          />
        </div>
      </FormSection>
      </>

      <>
      <fieldset disabled={!showSection("gallery")} className={showSection("gallery") ? undefined : "hidden"} aria-hidden={!showSection("gallery")}>
        <FormSection id="s-gallery" title="Галерея (слайдер)">
          <GalleryBuilder images={tour?.gallery} />
        </FormSection>
      </fieldset>
      <fieldset disabled={!showSection("included")} className={showSection("included") ? undefined : "hidden"} aria-hidden={!showSection("included")}>
        <FormSection id="s-included" title="Что входит в тур">
          <p className="mb-3 text-xs text-admin-fg-subtle">
            Гибкие колонки: свой заголовок, вид маркера и список пунктов для каждой.
          </p>
          <WhatIncludedBuilder groups={tour?.whatIncluded} />
        </FormSection>
      </fieldset>

      <fieldset disabled={!showSection("program")} className={showSection("program") ? undefined : "hidden"} aria-hidden={!showSection("program")}>
        <FormSection id="s-program" title="Программа по дням">
          <div className="space-y-3">
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setProgram((p) => {
                    const maxDay = p.reduce(
                      (acc, b) =>
                        Math.max(
                          acc,
                          b.dayStart ?? 0,
                          b.dayEnd ?? 0,
                        ),
                      0,
                    )
                    return [...p, { dayStart: Math.max(maxDay + 1, 1), dayEnd: undefined, customTitle: undefined, text: "" }]
                  })
                  markDirty()
                }}
              >
                <Plus className="h-4 w-4" /> День
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setProgram((p) => {
                    const maxDay = p.reduce(
                      (acc, b) =>
                        Math.max(
                          acc,
                          b.dayStart ?? 0,
                          b.dayEnd ?? 0,
                        ),
                      0,
                    )
                    const start = Math.max(maxDay + 1, 1)
                    return [
                      ...p,
                      { dayStart: start, dayEnd: start + 2, customTitle: undefined, text: "" },
                    ]
                  })
                  markDirty()
                }}
              >
                <Plus className="h-4 w-4" /> Диапазон
              </Button>
            </div>
            <div className="rounded-lg bg-admin-muted p-3">
              {program.map((day, i) => (
                <details
                  key={i}
                  open={i < 2}
                  className="group mb-3 overflow-hidden rounded-md border border-admin-border bg-white last:mb-0"
                >
                  <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 hover:bg-admin-muted/40">
                    <div className="flex min-w-0 items-center gap-3">
                      <ChevronDown className="h-4 w-4 shrink-0 text-admin-fg-subtle transition-transform group-open:rotate-180" />
                      <span className="inline-flex items-center rounded-full bg-brand/10 px-2 py-0.5 text-xs font-medium text-brand">
                        {autoProgramTitle(day)}
                      </span>
                      <span className="truncate text-sm text-admin-fg-subtle">
                        {day.text
                          ? day.text.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").slice(0, 100) || "— без описания —"
                          : "— без описания —"}
                      </span>
                    </div>
                    <IconButton
                      type="button"
                      tone="danger"
                      onClick={(e) => {
                        e.preventDefault()
                        setProgram((p) => p.filter((_, idx) => idx !== i))
                        markDirty()
                      }}
                      aria-label="Удалить блок программы"
                      className="shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </IconButton>
                  </summary>
                  <div className="space-y-3 border-t border-admin-border px-4 py-3">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div>
                        <Label>С (день)</Label>
                        <Input
                          type="number"
                          min={1}
                          max={400}
                          step={1}
                          name="programDayStart"
                          value={day.dayStart ?? ""}
                          onChange={(event) => updateProgram(i, { dayStart: event.target.value === "" ? undefined : Number(event.target.value) })}
                          placeholder="2"
                        />
                      </div>
                      <div>
                        <Label>По (день, пусто — один день)</Label>
                        <Input
                          type="number"
                          min={1}
                          max={400}
                          step={1}
                          name="programDayEnd"
                          value={day.dayEnd ?? ""}
                          onChange={(event) => updateProgram(i, { dayEnd: event.target.value === "" ? undefined : Number(event.target.value) })}
                          placeholder="4 (пусто = не диапазон)"
                        />
                      </div>
                      <div>
                        <Label>
                          Свой заголовок{" "}
                          <span className="text-admin-fg-subtle">(опционально)</span>
                        </Label>
                        <Input
                          name="programCustomTitle"
                          value={day.customTitle ?? ""}
                          onChange={(event) => updateProgram(i, { customTitle: event.target.value })}
                          placeholder="Переезд, заселение, обзорная экскурсия"
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Описание блока (Rich-формат)</Label>
                      <RichEditor
                        name="programText"
                        defaultValue={day.text}
                        placeholder="Программа на этот блок: завтрак, автобус, свободное время…"
                      />
                    </div>
                  </div>
                </details>
              ))}
            </div>
            <p className="text-xs text-admin-fg-subtle">
              Подсказка: сохраните, чтобы закрепить порядок блоков. Диапазон «Дни 2–4» покажет одну карточку для нескольких одинаковых дней маршрута.
            </p>
          </div>
        </FormSection>
      </fieldset>

      <fieldset disabled={!showSection("documents")} className={showSection("documents") ? undefined : "hidden"} aria-hidden={!showSection("documents")}>
        <FormSection id="s-docs" title="Полезные документы">
          <DocumentsBuilder documents={tour?.documents} />
        </FormSection>
      </fieldset>

      <fieldset disabled={!showSection("faq")} className={showSection("faq") ? undefined : "hidden"} aria-hidden={!showSection("faq")}>
        <FormSection id="s-faq" title="Частые вопросы (для этой страницы)">
          <FaqEditor items={faqs} groups={faqGroups} mode="groups" />
        </FormSection>
      </fieldset>

      </>

      <>
      <FormSection id="s-layout" title="Порядок блоков">
        <p className="mb-3 text-xs text-admin-fg-subtle">
          Скрыть (глаз), удалить или вернуть через «Добавить секцию» — как на страницах городов/стран.
        </p>
        <TourLayoutBuilder layout={layout} onChange={(l) => { setLayout(l); markDirty() }} />
      </FormSection>
      </>

      <>
      <fieldset disabled={!showSection("dates")} className={showSection("dates") ? undefined : "hidden"} aria-hidden={!showSection("dates")}>
        <FormSection id="s-dates" title="Даты и цены">
          {tour ? (
            <div className="space-y-4">
              <Alert tone="info">
                Даты и цены редактируются в отдельном рабочем пространстве с явным сохранением. Несохранённые изменения на этой странице не сохранятся автоматически — сохраните их перед переходом.
              </Alert>
              {/* ponytail: форма uncontrolled, а состояние билдеров делает дешёвый dirty-tracking ненадёжным; для редкого перехода всегда показываем подтверждение. */}
              <Button type="button" variant="secondary" onClick={() => setDatesConfirm(true)}>
                Редактировать даты и цены
              </Button>
              <ConfirmDialog
                open={datesConfirm}
                title="Перейти к датам и ценам?"
                message="Несохранённые изменения на этой странице могут быть потеряны. Перед переходом сохраните тур."
                confirmLabel="Перейти"
                onConfirm={() => router.push(`/admin/tour-pricing/${tour.id}`)}
                onCancel={() => setDatesConfirm(false)}
              />
            </div>
          ) : (
            <Alert tone="info">Сохраните тур, затем добавьте даты и цены в рабочем пространстве.</Alert>
          )}
        </FormSection>
      </fieldset>
      </>

      <>
      <FormSection id="s-seo-meta" title="SEO и мета">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="tour-meta-title">Title (SEO)</Label>
            <ShortcodeInput id="tour-meta-title" name="metaTitle" defaultValue={tourMeta.metaTitle} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="tour-meta-description">{SEO_META_DESCRIPTION_LABEL}</Label>
            <ShortcodeInput id="tour-meta-description" name="metaDescription" defaultValue={tourMeta.metaDescription} rows={3} multiline />
            <p className="mt-1 text-xs text-admin-fg-muted">{SEO_META_DESCRIPTION_HINT}</p>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="tour-meta-short">{SEO_META_SHORT_DESC_LABEL}</Label>
            <ShortcodeInput id="tour-meta-short" name="metaShortDesc" defaultValue={tourMeta.metaShortDesc} rows={2} multiline />
            <p className="mt-1 text-xs text-admin-fg-muted">{SEO_META_SHORT_DESC_HINT}</p>
          </div>
          <div className="sm:col-span-2">
            <SettingMediaField name="metaImage" label="Превью изображение" value={tourMeta.metaImage} />
          </div>
        </div>
      </FormSection>

      <div className={showSection("seo") ? undefined : "hidden"} aria-hidden={!showSection("seo")}>
        <FormSection id="s-seo" title="SEO-текст (расширенный)">
          <p className="mb-2 text-xs text-admin-fg-subtle">
            Форматирование, заголовки, списки, картинки, видео и ссылки. Показывается внизу страницы тура.
          </p>
          <div className="mb-4 max-w-3xl">
            <Label htmlFor="seoTitle" required={showSection("seo")}>Заголовок блока</Label>
            <ShortcodeInput
              id="seoTitle"
              name="seoTitle"
              label="Заголовок блока"
              defaultValue={tour?.seoTitle}
              placeholder="Дополнительная информация"
              required={showSection("seo")}
            />
            <p className="mt-1 text-xs text-admin-fg-subtle">Показывается как подчёркнутый заголовок SEO-блока.</p>
          </div>
          <RichEditor
            name="seoHtml"
            defaultValue={tour?.seoHtml}
            placeholder="SEO-текст страницы тура…"
            required={showSection("seo")}
          />
        </FormSection>
      </div>
      </>

      </EditorWorkspace>
    </form>
    </div>
  )
}
