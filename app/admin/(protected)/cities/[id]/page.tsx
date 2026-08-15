import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { saveCityPageAction } from "@/app/admin/city-actions"
import { getCityById, getCityDestinations } from "@/lib/cities"
import { getCountries } from "@/lib/countries"
import { getSettings, getBlocks, getSiteOrigin, getFaqBlocksForPage } from "@/lib/cms"
import { aviaCityPageConfig, hotCityPageConfig, resortsSectionFields } from "@/lib/admin-config"
import { PageSectionsManager } from "@/components/admin/page-sections-manager"
import { SectionFieldsForm } from "@/components/admin/section-fields-form"
import { PageSettingsForm } from "@/components/admin/page-settings-form"
import { CityBaseForm } from "@/components/admin/city-base-form"
import { ResortTableBuilder } from "@/components/admin/resort-table-builder"
import { TablePickerSelect } from "@/components/admin/table-picker-select"
import { EditorWorkspaceGroup } from "@/components/admin/editor-workspace"
import { FormSection } from "@/components/admin/ui"
import { buildFaqSlots } from "@/components/admin/build-faq-slots"
import { stripArchivedSuffix } from "@/lib/archive-slug"
import { buildSectionTitles } from "@/lib/section-titles"
import { DESTINATION_DEFAULT_SECTION_ORDER, resolveInitialOrder } from "@/lib/section-order"
import { buildFaqFormIds } from "@/lib/faq-slots"
import { adminCityOpenHref } from "@/lib/admin-public-href"

export const metadata: Metadata = { title: "Город — Админ-панель" }

const DEFAULT_ORDER = [...DESTINATION_DEFAULT_SECTION_ORDER]
const STATIC_HEADINGS = ["Шапка страницы"]

export default async function EditCityPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const city = await getCityById(Number(id))
  if (!city) notFound()

  const category = city.category
  const isHot = category === "hot"
  const isBus = category === "bus"
  const liveSlug = stripArchivedSuffix(city.slug)
  const pageKey = `city:${category}:${liveSlug}`
  const page = isHot
    ? hotCityPageConfig(liveSlug, city.name)
    : aviaCityPageConfig(liveSlug, city.name, isBus ? "bus" : "avia")
  const sections = page.sections ?? []

  const [settings, faqBlocks, resortBlocks, allCountries, allCities] = await Promise.all([
    getSettings(),
    getFaqBlocksForPage(pageKey),
    getBlocks("resort", { page: pageKey }),
    getCountries(category),
    getCityDestinations(category),
  ])

  const baseShortKeys = sections.map((s) => s.key.split(".section.")[1]).filter(Boolean)
  const initialOrder = resolveInitialOrder(
    settings[`${pageKey}.sections.order`],
    DEFAULT_ORDER,
    baseShortKeys,
  )
  const sectionTitles = buildSectionTitles(pageKey, settings, resortBlocks, initialOrder, faqBlocks)
  const faqSlots = buildFaqSlots(pageKey, initialOrder, faqBlocks)
  const faqFormIds = buildFaqFormIds(pageKey, initialOrder)
  const toggleKeys = sections.map((s) => s.key).join(",")

  const staticGroups = page.groups.filter((g) => STATIC_HEADINGS.includes(g.heading))
  const seoMetaGroup = page.groups.find((g) => g.heading === "SEO и мета")
  const citiesGroup = page.groups.find(
    (g) => g.heading === "Секция «Карточки курортов»" || g.heading === "Секция «Другие курорты»"
  )
  const searchGroup = page.groups.find(
    (g) =>
      g.fields.some((f) =>
        typeof f.key === "string" && f.key.endsWith(".searchTitle"),
      ),
  )
  const relatedCities = allCities.filter((c) => c.country === city.country && c.slug !== city.slug)
  const visibleRelatedCities = relatedCities.filter((c) => settings[`city:${category}:${c.slug}.visible`] !== "0")

  const seoKeysInOrder = initialOrder.filter((k) => k === "seo" || /^seo\d+$/.test(k))
  const maxSeoN = seoKeysInOrder.reduce((m, k) => {
    const n = k === "seo" ? 1 : parseInt(k.replace("seo", ""), 10)
    return Math.max(m, n)
  }, 1)
  const seoSlots: Record<string, React.ReactNode> = {}
  for (let n = 1; n <= maxSeoN + 3; n++) {
    const shortKey = n === 1 ? "seo" : `seo${n}`
    const suffix = n === 1 ? "" : `${n}`
    seoSlots[shortKey] = (
      <SectionFieldsForm
        fields={[
          {
            key: `${pageKey}.seoTitle${suffix}`,
            label: "Заголовок",
            placeholder: "Заголовок раздела с подчёркиванием",
          },
          {
            key: `${pageKey}.seoHtml${suffix}`,
            label: "SEO-текст",
            type: "richtext",
            hint: "Форматирование, заголовки, списки, ссылки.",
          },
        ]}
        settings={settings}
        hideSubmit
      />
    )
  }

  const resortsSlots: Record<string, React.ReactNode> = {}
  const resortsKeysInOrder = initialOrder.filter((k) => k === "resorts" || /^resorts\d+$/.test(k))
  const maxResortsN = resortsKeysInOrder.reduce((m, k) => {
    const n = k === "resorts" ? 1 : parseInt(k.replace("resorts", ""), 10)
    return Math.max(m, n)
  }, 1)
  for (let n = 1; n <= maxResortsN + 3; n++) {
    const shortKey = n === 1 ? "resorts" : `resorts${n}`
    const suffix = n === 1 ? "" : `${n}`
    const pickerSettingKey = `${pageKey}.section.${shortKey}.tableId`
    const currentTableId = settings[pickerSettingKey] ?? ""
    resortsSlots[shortKey] = (
      <div className="space-y-6">
        <TablePickerSelect
          settingKey={pickerSettingKey}
          blocks={resortBlocks}
          currentValue={currentTableId}
        />
        <SectionFieldsForm
          fields={resortsSectionFields(pageKey, { suffix })}
          settings={settings}
          hideSubmit
        />
      </div>
    )
  }

  const countrySlug =
    allCountries.find((c) => c.id === city.countryId)?.slug ??
    allCountries.find((c) => c.name === city.country)?.slug ??
    "_"

  const siteOrigin = getSiteOrigin(settings)
  const hotWidget = settings["hot.widget"]?.trim() || "hot"
  const hotWidgetId = hotWidget === "avia" ? "9974602" : "9986280"
  const pageHref = adminCityOpenHref({
    category,
    countrySlug,
    citySlug: city.slug,
    aviaSlugRaw: settings["aviatory.slug"],
  })
  const widgetHref = isHot
    ? `https://pro.tourvisor.ru/module/search/${hotWidgetId}?siteUrl=${siteOrigin}${pageHref}`
    : isBus
    ? undefined
    : `https://pro.tourvisor.ru/module/search/9974602?siteUrl=${siteOrigin}${pageHref}`

  const countriesOptions = allCountries.map((c) => ({ id: c.id, name: c.name }))
  const homeVisKey = isHot ? "hot.visible" : isBus ? "bustours.visible" : "aviatory.visible"
  const homeVisible = homeVisKey ? settings[homeVisKey] !== "0" : true
  const countryVisible = countrySlug === "_" || settings[`country:${category}:${countrySlug}.visible`] !== "0"
  const cityVisKey = `${pageKey}.visible`
  const hasSettings = (fields: { key: string }[]) =>
    fields.some((field) => Boolean(settings[field.key]?.trim()))
  const basicBadge = Boolean(
    city.name.trim() ||
      city.slug.trim() ||
      city.country?.trim() ||
      (seoMetaGroup && hasSettings(seoMetaGroup.fields)) ||
      hasSettings(staticGroups.flatMap((group) => group.fields)),
  )
  const contentFields = [
    ...(citiesGroup?.fields ?? []),
  ]
  const contentBadge = Boolean(
    hasSettings(contentFields) ||
      hasSettings([
        { key: `${pageKey}.seoTitle` },
        { key: `${pageKey}.seoHtml` },
      ]) ||
      relatedCities.length,
  )
  const workspaceGroups: EditorWorkspaceGroup[] = [
    {
      id: "main",
      label: "Основное",
      badge: basicBadge,
      anchorIds: ["s-city-base", "s-seo-meta", "s-page-header"],
    },
    {
      id: "content",
      label: "Контент",
      badge: contentBadge,
      anchorIds: [
        "sec-search",
        "sec-cities",
        "sec-seo",
        "sec-faq",
      ],
    },
    { id: "tables", label: "Таблицы", badge: resortBlocks.length > 0, anchorIds: ["resort-table"] },
    {
      id: "order",
      label: "Порядок секций",
      badge: initialOrder.length > 0,
      anchorIds: ["sec-order"],
    },
  ]

  const branchLabel = isHot ? "горящих туров" : isBus ? "автобусных туров" : "авиатуров"
  const parentWarning = !homeVisible
    ? `Главная ${branchLabel} скрыта — все страницы ветки недоступны посетителям.`
    : !countryVisible
    ? `Страна (${city.country}) скрыта — этот город тоже недоступен.`
    : undefined

  return (
    <div className="space-y-4">
      <PageSettingsForm
        title={page.heading}
        saveAction={saveCityPageAction}
        description="SEO, шапка страницы, карточки курортов, таблицы и FAQ."
        pageHref={pageHref}
        widgetHref={widgetHref}
        visibilityKey={cityVisKey}
        defaultVisible={settings[cityVisKey] !== "0"}
        parentHiddenWarning={parentWarning}
        workspaceGroups={workspaceGroups}
        workspaceBeforeForm={
          <div className="space-y-4">
            <FormSection
              key="city-base"
              id="s-city-base"
              title="Основные данные"
              collapsible={false}
            >
              <CityBaseForm city={city} countries={countriesOptions} />
            </FormSection>
            {seoMetaGroup && (
              <FormSection key="seo-meta" id="s-seo-meta" title="SEO и мета">
                <SectionFieldsForm fields={seoMetaGroup.fields} settings={settings} />
              </FormSection>
            )}
            {staticGroups.map((group) => (
              <FormSection
                key={group.heading}
                id="s-page-header"
                title={group.heading}
                collapsible={false}
              >
                <SectionFieldsForm fields={group.fields} settings={settings} />
              </FormSection>
            ))}
          </div>
        }
        workspaceExtraPanels={[
          <div key="resort-table" id="resort-table" className="mt-6 scroll-mt-4">
            <ResortTableBuilder
              pageKey={pageKey}
              blocks={resortBlocks}
              returnTo={`/admin/cities/${id}`}
            />
          </div>,
        ]}
        workspaceAfterForm={
          <div id="sec-order" className="scroll-mt-4">
            <PageSectionsManager
              pageKey={pageKey}
              sections={sections}
              initialOrder={initialOrder}
              settings={settings}
              toggleKeys={toggleKeys}
              sectionTitles={sectionTitles}
              view="order"
            />
          </div>
        }
      >
        <div className="space-y-6">
          <PageSectionsManager
            pageKey={pageKey}
            sections={sections}
            initialOrder={initialOrder}
            settings={settings}
            toggleKeys={toggleKeys}
            hideSidebar
            sectionSlots={{
              search: searchGroup ? (
                <div className="space-y-4">
                  <p className="text-sm text-admin-fg-muted">
                    Фильтры и каталог туров в выбранном городе. Перетащите секцию, чтобы
                    разместить блоки выше или ниже каталога.
                  </p>
                  <SectionFieldsForm fields={searchGroup.fields} settings={settings} hideSubmit />
                </div>
              ) : (
                <p className="text-sm text-admin-fg-muted">
                  Фильтры и каталог туров в выбранном городе.
                </p>
              ),
              cities: citiesGroup ? (
                <div className="space-y-4">
                  <p className="mb-4 text-sm text-admin-fg-muted">На сайте показываются курорты этой страницы, отмеченные как видимые; скрытые не отображаются. Управляйте видимостью в разделе «Курорты». Сейчас видимых на сайте: {visibleRelatedCities.length} из {relatedCities.length}.</p>
                  <SectionFieldsForm fields={citiesGroup.fields} settings={settings} hideSubmit />
                </div>
              ) : null,
              ...resortsSlots,
              ...seoSlots,
              ...faqSlots,
              callus: (
                <p className="text-sm text-admin-fg-muted">
                  Баннер «Есть вопросы?» отображается внизу страницы. Текст и кнопку можно изменить в{" "}
                  <a href="/admin/settings" className="underline hover:text-admin-fg">Настройках</a>{" "}
                  (раздел «Баннер заказа звонка»). Переключите видимость глазком выше.
                </p>
              ),
            }}
          />
        </div>
      </PageSettingsForm>
    </div>
  )
}
