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

export const metadata: Metadata = { title: "Аренда автобусов — Админ-панель" }

export default async function RentalAdminPage() {
  const pageKey = "rental"
  const page = pageSettingsGroups.rental
  const sections: PageSection[] = [
    { key: `${pageKey}.section.seo`, label: "Расширенный текст" },
    { key: `${pageKey}.section.faq`, label: "Частые вопросы" },
    { key: `${pageKey}.section.callus`, label: "«Есть вопросы?»" },
    { key: `${pageKey}.section.leadform`, label: "Оставьте заявку" },
  ]
  const [settings, faqBlocks] = await Promise.all([
    getSettings(),
    getFaqBlocksForPage(pageKey),
  ])
  const defaultOrder = ["seo", "faq", "callus"]
  const sectionKeys = sections.map((section) => section.key.split(".section.")[1]).filter(Boolean)
  const initialOrder = resolveInitialOrder(
    settings[`${pageKey}.sections.order`],
    defaultOrder,
    sectionKeys,
    ["seo", "faq", "callus"],
    ["leadform"],
  )
  const sectionTitles = buildSectionTitles(pageKey, settings, [], initialOrder, faqBlocks)
  const faqSlots = buildFaqSlots(pageKey, initialOrder, faqBlocks)
  const faqFormIds = buildFaqFormIds(pageKey, initialOrder)
  const toggleKeys = sections.map((section) => section.key).join(",")
  const fields = page.groups.flatMap((group) => group.fields)
  const hasSettings = (keys: string[]) => keys.some((key) => Boolean(settings[key]?.trim()))

  const seoSlots: Record<string, React.ReactNode> = {}
  const seoKeysInOrder = initialOrder.filter((key) => key === "seo" || /^seo\d+$/.test(key))
  const maxSeoN = seoKeysInOrder.reduce((max, key) => {
    const n = key === "seo" ? 1 : parseInt(key.replace("seo", ""), 10)
    return Math.max(max, n)
  }, 1)
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

  const workspaceGroups: EditorWorkspaceGroup[] = [
    {
      id: "main",
      label: "Основное",
      badge: hasSettings(fields.map((field) => field.key)),
      anchorIds: ["s-rental-base", "s-page-header"],
    },
    {
      id: "content",
      label: "Контент",
      badge: Boolean(
        hasSettings([`${pageKey}.seoTitle`, `${pageKey}.seoHtml`]),
      ),
      anchorIds: ["sec-seo", "sec-faq"],
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
        description="Тексты страницы, расширенные блоки и FAQ."
        pageHref={page.url}
        workspaceGroups={workspaceGroups}
        workspaceBeforeForm={
          <div className="space-y-4">
            {page.groups.map((group) => (
              <FormSection
                key={group.heading}
                id={group.heading === "Шапка страницы" ? "s-page-header" : "s-rental-base"}
                title={group.heading}
                collapsible={false}
              >
                <SectionFieldsForm fields={group.fields} settings={settings} />
              </FormSection>
            ))}
          </div>
        }
        workspaceExtraPanels={[
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
            ...faqSlots,
            callus: (
              <div className="space-y-2 text-sm text-admin-fg-muted">
                <p>
                  Баннер «Есть вопросы?» отображается внизу страницы. Текст и кнопку можно изменить в{" "}
                  <a href="/admin/settings" className="underline hover:text-admin-fg">
                    Настройках
                  </a>
                  .
                </p>
                <p>Автобусы и их подробные страницы управляются в разделе «Автобусный парк».</p>
              </div>
            ),
            leadform: (
              <div className="space-y-2 text-sm text-admin-fg-muted">
                <p>Здесь будет отображаться форма заявки на аренду автобуса.</p>
              </div>
            ),
          }}
        />
      </PageSettingsForm>
    </div>
  )
}
