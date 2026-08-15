import type { Metadata } from "next"
import { getSettings, getBlocks, getFaqBlocksForPage } from "@/lib/cms"
import { getCityDestinations } from "@/lib/cities"
import { busHomePageConfig, resortsSectionFields } from "@/lib/admin-config"
import { PageSectionsManager } from "@/components/admin/page-sections-manager"
import { SectionFieldsForm } from "@/components/admin/section-fields-form"
import { PageSettingsForm } from "@/components/admin/page-settings-form"
import { ResortTableBuilder } from "@/components/admin/resort-table-builder"
import { TablePickerSelect } from "@/components/admin/table-picker-select"
import { EditorWorkspaceGroup } from "@/components/admin/editor-workspace"
import { FormSection } from "@/components/admin/ui"
import { buildFaqSlots } from "@/components/admin/build-faq-slots"
import { buildSectionTitles } from "@/lib/section-titles"
import { DESTINATION_DEFAULT_SECTION_ORDER, resolveInitialOrder } from "@/lib/section-order"
import { buildFaqFormIds } from "@/lib/faq-slots"

export const metadata: Metadata = { title: "Автобусные туры — Главная — Админ-панель" }

const DEFAULT_ORDER = [...DESTINATION_DEFAULT_SECTION_ORDER]
const STATIC_HEADINGS = ["Шапка страницы"]

export default async function BusHomePage() {
  const pageKey = "bustours"
  const page = busHomePageConfig()
  const sections = page.sections ?? []

  const [settings, faqBlocks, resortBlocks, allCities] = await Promise.all([
    getSettings(),
    getFaqBlocksForPage(pageKey),
    getBlocks("resort", { page: pageKey }),
    getCityDestinations("bus"),
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
  const citiesGroup = page.groups.find((g) => g.heading === "Секция «Карточки направлений»")
  const searchGroup = page.groups.find(
    (g) =>
      g.fields.some((f) =>
        typeof f.key === "string" && f.key.endsWith(".searchTitle"),
      ),
  )
  const visibleCities = allCities.filter((c) => settings[`city:bus:${c.slug}.visible`] !== "0")

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

  const resortsKeysInOrder = initialOrder.filter((k) => k === "resorts" || /^resorts\d+$/.test(k))
  const maxResortsN = resortsKeysInOrder.reduce((m, k) => {
    const n = k === "resorts" ? 1 : parseInt(k.replace("resorts", ""), 10)
    return Math.max(m, n)
  }, 1)
  const resortsSlots: Record<string, React.ReactNode> = {}
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

  const hasSettings = (fields: { key: string }[]) =>
    fields.some((field) => Boolean(settings[field.key]?.trim()))
  const basicBadge = Boolean(
    (seoMetaGroup && hasSettings(seoMetaGroup.fields)) ||
      hasSettings(staticGroups.flatMap((group) => group.fields)),
  )
  const contentBadge = Boolean(
    hasSettings(citiesGroup?.fields ?? []) ||
      hasSettings([
        { key: `${pageKey}.seoTitle` },
        { key: `${pageKey}.seoHtml` },
      ]) ||
      allCities.length,
  )
  const workspaceGroups: EditorWorkspaceGroup[] = [
    {
      id: "main",
      label: "Основное",
      badge: basicBadge,
      anchorIds: ["s-seo-meta", "s-page-header"],
    },
    {
      id: "content",
      label: "Контент",
      badge: contentBadge,
      anchorIds: ["sec-search", "sec-cities", "sec-seo", "sec-faq"],
    },
    {
      id: "tables",
      label: "Таблицы",
      badge: resortBlocks.length > 0,
      anchorIds: ["resort-table"],
    },
    {
      id: "order",
      label: "Порядок секций",
      badge: initialOrder.length > 0,
      anchorIds: ["sec-order"],
    },
  ]

  return (
    <div className="space-y-4">
      <PageSettingsForm
        title={page.heading}
        description="SEO, шапка страницы, карточки направлений и FAQ."
        pageHref="/avtobusnye-tury/"
        visibilityKey="bustours.visible"
        defaultVisible={settings["bustours.visible"] !== "0"}
        workspaceGroups={workspaceGroups}
        workspaceBeforeForm={
          <div className="space-y-4">
            {seoMetaGroup ? (
              <FormSection key="seo-meta" id="s-seo-meta" title="SEO и мета">
                <SectionFieldsForm fields={seoMetaGroup.fields} settings={settings} />
              </FormSection>
            ) : null}
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
          <div id="resort-table" className="mt-6 scroll-mt-4">
            <ResortTableBuilder
              pageKey={pageKey}
              blocks={resortBlocks}
              returnTo="/admin/pages/bus-home"
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
                    Поиск, фильтры и список опубликованных автобусных туров. Перетащите секцию,
                    чтобы разместить остальные блоки выше или ниже каталога.
                  </p>
                  <SectionFieldsForm fields={searchGroup.fields} settings={settings} hideSubmit />
                </div>
              ) : (
                <p className="text-sm text-admin-fg-muted">
                  Поиск, фильтры и список опубликованных автобусных туров.
                </p>
              ),
              cities: citiesGroup ? (
                <>
                  <p className="mb-4 text-sm text-admin-fg-muted">
                    На сайте направления в сайдбаре — города категории «Автобусные». Сейчас видимых:{" "}
                    {visibleCities.length} из {allCities.length}.
                  </p>
                  <SectionFieldsForm fields={citiesGroup.fields} settings={settings} hideSubmit />
                </>
              ) : null,

              ...resortsSlots,

              ...seoSlots,
              ...faqSlots,

              callus: (
                <p className="text-sm text-admin-fg-muted">
                  Баннер «Есть вопросы?» отображается в позиции, выбранной в порядке секций. Текст и кнопку можно изменить в{" "}
                  <a href="/admin/settings" className="underline hover:text-admin-fg">
                    Настройках
                  </a>{" "}
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
