import type { Metadata } from "next"
import { getBlocks, getSettings, getFaqBlocksForPage } from "@/lib/cms"
import { pageSettingsGroups, type PageSection } from "@/lib/admin-config"
import { buildFaqSlots } from "@/components/admin/build-faq-slots"
import { EditorWorkspaceGroup } from "@/components/admin/editor-workspace"
import { FormSection } from "@/components/admin/ui"
import { PageSectionsManager } from "@/components/admin/page-sections-manager"
import { PageSettingsForm } from "@/components/admin/page-settings-form"
import { SectionFieldsForm } from "@/components/admin/section-fields-form"
import { buildSectionTitles } from "@/lib/section-titles"
import { resolveInitialOrder } from "@/lib/section-order"
import { buildFaqFormIds } from "@/lib/faq-slots"

export const metadata: Metadata = { title: "Компания — Админ-панель" }

export default async function CompanyAdminPage() {
  const pageKey = "company"
  const page = pageSettingsGroups.company
  const sections: PageSection[] = [
    { key: `${pageKey}.section.faq`, label: "Частые вопросы" },
    { key: `${pageKey}.section.callus`, label: "Перезвоните нам" },
  ]
  const [settings, faqBlocks] = await Promise.all([
    getSettings(),
    getFaqBlocksForPage(pageKey),
  ])
  const defaultOrder = ["faq", "callus"]
  const sectionKeys = sections.map((section) => section.key.split(".section.")[1]).filter(Boolean)
  const initialOrder = resolveInitialOrder(
    settings[`${pageKey}.sections.order`],
    defaultOrder,
    sectionKeys,
    ["faq", "callus"],
  )
  const sectionTitles = buildSectionTitles(pageKey, settings, [], initialOrder, faqBlocks)
  const faqSlots = buildFaqSlots(pageKey, initialOrder, faqBlocks)
  const faqFormIds = buildFaqFormIds(pageKey, initialOrder)
  const toggleKeys = sections.map((section) => section.key).join(",")
  const fields = page.groups.flatMap((group) => group.fields)
  const hasSettings = (keys: string[]) => keys.some((key) => Boolean(settings[key]?.trim()))

  const workspaceGroups: EditorWorkspaceGroup[] = [
    {
      id: "main",
      label: "Основное",
      badge: hasSettings(fields.map((field) => field.key)),
      anchorIds: ["s-company-base"],
    },
    {
      id: "content",
      label: "Контент",
      badge: faqBlocks.length > 0,
      anchorIds: ["sec-faq"],
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
        description="SEO, тексты страницы и FAQ."
        pageHref={page.url}
        workspaceGroups={workspaceGroups}
        workspaceBeforeForm={
          <FormSection id="s-company-base" title="Основные данные" collapsible={false}>
            {page.groups.map((group) => (
              <SectionFieldsForm key={group.heading} fields={group.fields} settings={settings} />
            ))}
          </FormSection>
        }
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
            ...faqSlots,
            callus: (
              <p className="text-sm text-admin-fg-muted">
                Баннер «Есть вопросы?» идёт в порядке секций на публичной странице. Текст и кнопку — в{" "}
                <a href="/admin/settings" className="underline hover:text-admin-fg">
                  Настройках
                </a>
                .
              </p>
            ),
          }}
        />
      </PageSettingsForm>
    </div>
  )
}
