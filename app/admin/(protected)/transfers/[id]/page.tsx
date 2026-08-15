import { notFound } from "next/navigation"
import { getTransferById, getTransferSchedules } from "@/lib/queries"
import { getSettings, getFaqBlocksForPage } from "@/lib/cms"
import { transferPageConfig } from "@/lib/admin-config"
import { TransferBaseForm } from "@/components/admin/transfer-base-form"
import { TransferSchedulesPanel } from "@/components/admin/transfer-schedules-panel"
import { buildFaqSlots } from "@/components/admin/build-faq-slots"
import { EditorWorkspaceGroup } from "@/components/admin/editor-workspace"
import { FormSection } from "@/components/admin/ui"
import { PageSectionsManager } from "@/components/admin/page-sections-manager"
import { PageSettingsForm } from "@/components/admin/page-settings-form"
import { SectionFieldsForm } from "@/components/admin/section-fields-form"
import { buildSectionTitles } from "@/lib/section-titles"
import { resolveInitialOrder } from "@/lib/section-order"
import { buildFaqFormIds } from "@/lib/faq-slots"
import { withTransferSeoAlias } from "@/lib/transfer-display"

export default async function EditTransferPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const transfer = await getTransferById(Number(id))
  if (!transfer) notFound()
  const pageKey = `transfer:${transfer.slug}`
  const page = transferPageConfig(transfer.slug, transfer.title)
  const sections = page.sections
  const defaultOrder = ["seo", "schedules", "faq", "callus"]
  const [rawSettings, faqBlocks, schedules] = await Promise.all([
    getSettings(),
    getFaqBlocksForPage(pageKey),
    getTransferSchedules(transfer.id),
  ])
  const settings = withTransferSeoAlias(rawSettings, pageKey)
  const initialOrder = resolveInitialOrder(
    settings[`${pageKey}.sections.order`],
    defaultOrder,
    sections.map((s) => s.key.split(".section.")[1]!),
  )
  const sectionTitles = buildSectionTitles(pageKey, settings, [], initialOrder, faqBlocks)
  const faqSlots = buildFaqSlots(pageKey, initialOrder, faqBlocks)
  const faqFormIds = buildFaqFormIds(pageKey, initialOrder)
  const toggleKeys = sections.map((s) => s.key).join(",")
  const meta = page.groups[0]

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

  const has = (keys: string[]) => keys.some((key) => Boolean(settings[key]?.trim()))
  const workspaceGroups: EditorWorkspaceGroup[] = [
    { id: "main", label: "Основное", badge: Boolean(transfer.title || transfer.image || transfer.intro), anchorIds: ["s-transfer-base", "s-transfer-meta"] },
    {
      id: "content",
      label: "Контент",
      badge: has([`${pageKey}.seoTitle`, `${pageKey}.seoHtml`]) || faqBlocks.length > 0,
      anchorIds: ["sec-seo"],
    },
    { id: "schedules", label: "Расписания", badge: schedules.length > 0, anchorIds: ["transfer-schedules", "transfer-schedules-outbound", "transfer-schedules-return"] },
    { id: "order", label: "Порядок секций", badge: initialOrder.length > 0, anchorIds: ["sec-order"] },
  ]
  return (
    <PageSettingsForm
      title={page.heading}
      description="Данные трансфера, расписания, FAQ и SEO."
      pageHref={page.url}
      visibilityKey={`${pageKey}.visible`}
      defaultVisible={settings[`${pageKey}.visible`] !== "0"}
      workspaceGroups={workspaceGroups}
      workspaceBeforeForm={<div className="space-y-4">
        <FormSection id="s-transfer-base" title="Основные данные" collapsible={false}>
          <TransferBaseForm
            transfer={transfer}
            pageHeadingKey={`${pageKey}.h1`}
            pageHeadingValue={settings[`${pageKey}.h1`] ?? ""}
          />
        </FormSection>
        <FormSection id="s-transfer-meta" title="SEO и мета"><SectionFieldsForm fields={meta.fields} settings={settings} /></FormSection>
      </div>}
      workspaceExtraPanels={[
        <TransferSchedulesPanel
          key="schedules"
          transferId={transfer.id}
          outbound={schedules.filter((s) => s.direction === "outbound")}
          inbound={schedules.filter((s) => s.direction === "return")}
          pageKey={pageKey}
          settings={settings}
        />,
      ]}
      workspaceAfterForm={<div id="sec-order" className="scroll-mt-4"><PageSectionsManager pageKey={pageKey} sections={sections} initialOrder={initialOrder} settings={settings} toggleKeys={toggleKeys} sectionTitles={sectionTitles} view="order" /></div>}
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
          ...faqSlots,
          schedules: <p className="text-sm text-admin-fg-muted">Расписания редактируются во вкладке «Расписания».</p>,
          callus: <p className="text-sm text-admin-fg-muted">Баннер «Есть вопросы?» настраивается в общих настройках сайта.</p>,
        }}
      />
    </PageSettingsForm>
  )
}
