import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getBusById } from "@/lib/queries"
import { getBlocks, getSettings, getFaqBlocksForPage } from "@/lib/cms"
import { busPageConfig } from "@/lib/admin-config"
import { BusBaseForm } from "@/components/admin/bus-base-form"
import { buildFaqSlots } from "@/components/admin/build-faq-slots"
import { EditorWorkspaceGroup } from "@/components/admin/editor-workspace"
import { FormSection } from "@/components/admin/ui"
import { PageSectionsManager } from "@/components/admin/page-sections-manager"
import { PageSettingsForm } from "@/components/admin/page-settings-form"
import { ResortTableBuilder } from "@/components/admin/resort-table-builder"
import { SectionFieldsForm } from "@/components/admin/section-fields-form"
import { TablePickerSelect } from "@/components/admin/table-picker-select"
import { buildSectionTitles } from "@/lib/section-titles"
import { resolveInitialOrder } from "@/lib/section-order"
import { buildFaqFormIds } from "@/lib/faq-slots"

export const metadata: Metadata = { title: "Автобус — Аренда автобусов — Админ-панель" }

export default async function EditBusPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const bus = await getBusById(Number(id))
  if (!bus) notFound()

  const pageKey = `bus:${bus.slug}`
  const page = busPageConfig(bus.slug, bus.title)
  const sections = page.sections
  const defaultOrder = ["specs", "documents", "seating", "seo", "resorts", "faq", "callus"]

  const [settings, faqBlocks, resortBlocks] = await Promise.all([
    getSettings(),
    getFaqBlocksForPage(pageKey),
    getBlocks("resort", { page: pageKey }),
  ])

  const baseShortKeys = sections.map((section) => section.key.split(".section.")[1]).filter(Boolean)
  const initialOrder = resolveInitialOrder(
    settings[`${pageKey}.sections.order`],
    defaultOrder,
    baseShortKeys,
  )
  const sectionTitles = buildSectionTitles(pageKey, settings, resortBlocks, initialOrder, faqBlocks)
  const faqSlots = buildFaqSlots(pageKey, initialOrder, faqBlocks)
  const faqFormIds = buildFaqFormIds(pageKey, initialOrder)
  const toggleKeys = sections.map((section) => section.key).join(",")
  const seoMetaGroup = page.groups.find((group) => group.heading === "SEO и мета")

  const seoKeysInOrder = initialOrder.filter((key) => key === "seo" || /^seo\d+$/.test(key))
  const maxSeoN = seoKeysInOrder.reduce((max, key) => {
    const n = key === "seo" ? 1 : parseInt(key.replace("seo", ""), 10)
    return Math.max(max, n)
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
            placeholder: "Заголовок расширенного текста",
          },
          {
            key: `${pageKey}.seoHtml${suffix}`,
            label: "Расширенный текст",
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
  const resortsKeysInOrder = initialOrder.filter((key) => key === "resorts" || /^resorts\d+$/.test(key))
  const maxResortsN = resortsKeysInOrder.reduce((max, key) => {
    const n = key === "resorts" ? 1 : parseInt(key.replace("resorts", ""), 10)
    return Math.max(max, n)
  }, 1)
  for (let n = 1; n <= maxResortsN + 3; n++) {
    const shortKey = n === 1 ? "resorts" : `resorts${n}`
    const settingKey = `${pageKey}.section.${shortKey}.tableId`
    resortsSlots[shortKey] = (
      <TablePickerSelect
        settingKey={settingKey}
        blocks={resortBlocks}
        currentValue={settings[settingKey] ?? ""}
      />
    )
  }

  const hasSettings = (fields: { key: string }[]) =>
    fields.some((field) => Boolean(settings[field.key]?.trim()))
  const basicBadge = Boolean(
    bus.title.trim() ||
      bus.slug.trim() ||
      bus.year.trim() ||
      bus.seats.trim() ||
      bus.busClass.trim() ||
      bus.phone.trim() ||
      bus.image.trim() ||
      bus.gallery.length ||
      bus.documents.length ||
      bus.seating.length ||
      (seoMetaGroup && hasSettings(seoMetaGroup.fields)),
  )
  const contentBadge = Boolean(
    hasSettings([
      { key: `${pageKey}.seoTitle` },
      { key: `${pageKey}.seoHtml` },
    ]),
  )
  const workspaceGroups: EditorWorkspaceGroup[] = [
    {
      id: "main",
      label: "Основное",
      badge: basicBadge,
      anchorIds: ["s-bus-base", "s-seo-meta"],
    },
    {
      id: "content",
      label: "Контент",
      badge: contentBadge,
      anchorIds: ["sec-seo", "sec-faq"],
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
        description="Данные автобуса, расширенный текст, таблицы и FAQ."
        pageHref={page.url}
        visibilityKey={`${pageKey}.visible`}
        defaultVisible={settings[`${pageKey}.visible`] !== "0"}
        workspaceGroups={workspaceGroups}
        workspaceBeforeForm={
          <div className="space-y-4">
            <FormSection id="s-bus-base" title="Основные данные" collapsible={false}>
              <BusBaseForm
                bus={bus}
                pageHeadingKey={`${pageKey}.h1`}
                pageHeadingValue={settings[`${pageKey}.h1`] ?? ""}
              />
            </FormSection>
            {seoMetaGroup && (
              <FormSection id="s-seo-meta" title="SEO и мета">
                <SectionFieldsForm fields={seoMetaGroup.fields} settings={settings} />
              </FormSection>
            )}
          </div>
        }
        workspaceExtraPanels={[
          <div id="resort-table" className="mt-6 scroll-mt-4">
              <ResortTableBuilder
                pageKey={pageKey}
                blocks={resortBlocks}
                returnTo={`/admin/buses/${id}`}
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
        <PageSectionsManager
          pageKey={pageKey}
          sections={sections}
          initialOrder={initialOrder}
          settings={settings}
          toggleKeys={toggleKeys}
          hideSidebar
          sectionSlots={{
            ...seoSlots,
            ...resortsSlots,
            ...faqSlots,
            specs: (
              <p className="text-sm text-admin-fg-muted">
                Год, места, класс и телефон редактируются в блоке «Основные данные» выше.
              </p>
            ),
            documents: (
              <p className="text-sm text-admin-fg-muted">
                Файлы документов редактируются в «Основные данные» → Документы.
              </p>
            ),
            seating: (
              <p className="text-sm text-admin-fg-muted">
                Посадочная схема редактируется в «Основные данные» → Рассадка.
              </p>
            ),
            callus: (
              <p className="text-sm text-admin-fg-muted">
                Баннер «Есть вопросы?» отображается внизу страницы. Текст и кнопку можно изменить в{" "}
                <a href="/admin/settings" className="underline hover:text-admin-fg">
                  Настройках
                </a>
                . Переключите видимость глазком выше.
              </p>
            ),
          }}
        />
      </PageSettingsForm>
    </div>
  )
}
