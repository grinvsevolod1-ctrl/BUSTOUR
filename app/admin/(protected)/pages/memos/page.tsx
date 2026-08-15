import type { Metadata } from "next"
import { Plus } from "lucide-react"
import { getSettings, getFaqBlocksForPage } from "@/lib/cms"
import { pageSettingsGroups, type PageSection } from "@/lib/admin-config"
import { buildFaqSlots } from "@/components/admin/build-faq-slots"
import { EditorWorkspaceGroup } from "@/components/admin/editor-workspace"
import { FormSection, Button, EmptyState } from "@/components/admin/ui"
import { PageSectionsManager } from "@/components/admin/page-sections-manager"
import { PageSettingsForm } from "@/components/admin/page-settings-form"
import { SectionFieldsForm } from "@/components/admin/section-fields-form"
import { MemosTabsTable } from "@/components/admin/memos-tabs-table"
import { buildSectionTitles } from "@/lib/section-titles"
import { resolveInitialOrder } from "@/lib/section-order"
import { buildFaqFormIds } from "@/lib/faq-slots"
import {
  MEMOS_PAGE_CMS_KEY,
  MEMOS_PAGE_SECTIONS_DEFAULT,
  memoAdminRows,
  resolveMemosTabsOrder,
} from "@/lib/memos-page-cms"
import {
  createMemoTabAction,
  deleteMemoTabAction,
  moveMemoTabAction,
  reorderMemoTabsAction,
} from "@/app/admin/cms-actions"

export const metadata: Metadata = { title: "Памятка туристу — Админ-панель" }

export default async function MemosAdminPage() {
  const pageKey = MEMOS_PAGE_CMS_KEY
  const page = pageSettingsGroups.memos
  // Только стандартные extras — вкладки memo живут в #memos-list, не здесь
  const sections: PageSection[] = [
    { key: `${pageKey}.section.faq`, label: "Частые вопросы" },
    { key: `${pageKey}.section.callus`, label: "«Есть вопросы?»" },
  ]
  const [settings, faqBlocks] = await Promise.all([
    getSettings(),
    getFaqBlocksForPage(pageKey),
  ])
  const defaultOrder = [...MEMOS_PAGE_SECTIONS_DEFAULT]
  const sectionKeys = sections.map((s) => s.key.split(".section.")[1]!).filter(Boolean)
  const initialOrder = resolveInitialOrder(
    settings[`${pageKey}.sections.order`],
    defaultOrder,
    sectionKeys,
    ["faq", "callus"],
  ).filter((k) => !k.startsWith("memo"))
  const sectionTitles = buildSectionTitles(pageKey, settings, [], initialOrder, faqBlocks)
  const faqSlots = buildFaqSlots(pageKey, initialOrder, faqBlocks)
  const faqFormIds = buildFaqFormIds(pageKey, initialOrder)
  const toggleKeys = sections.map((section) => section.key).join(",")
  const baseFields = page.groups.flatMap((group) => group.fields)
  const hasSettings = (keys: string[]) => keys.some((key) => Boolean(settings[key]?.trim()))
  const tabOrder = resolveMemosTabsOrder(settings)
  const rows = memoAdminRows(settings, tabOrder)

  const workspaceGroups: EditorWorkspaceGroup[] = [
    {
      id: "main",
      label: "Основное",
      badge: hasSettings(baseFields.map((f) => f.key)),
      anchorIds: ["page-settings"],
    },
    {
      id: "tabs",
      label: "Вкладки",
      badge: rows.length > 0,
      anchorIds: ["memos-list"],
    },
    {
      id: "content",
      label: "Контент",
      badge: faqBlocks.length > 0 || initialOrder.includes("callus"),
      anchorIds: ["sec-callus"],
    },
    {
      id: "order",
      label: "Порядок секций",
      badge: initialOrder.length > 0,
      anchorIds: ["sec-order"],
    },
  ]

  return (
    <PageSettingsForm
      title={page.heading}
      description="SEO, шапка и список вкладок. Редактирование вкладки — на отдельной странице."
      pageHref={page.url}
      workspaceGroups={workspaceGroups}
      workspaceBeforeForm={
        <FormSection id="page-settings" title="Основные данные" collapsible={false}>
          {page.groups.map((group) => (
            <div key={group.heading}>
              <h2 className="mb-2 text-sm font-medium text-admin-fg">{group.heading}</h2>
              <SectionFieldsForm fields={group.fields} settings={settings} />
            </div>
          ))}
        </FormSection>
      }
      workspaceMidPanels={[
        <div key="memos-list" id="memos-list" className="scroll-mt-4 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-admin-fg">Вкладки памяток</h2>
              <p className="text-xs text-admin-fg-muted">Всего: {rows.length}</p>
            </div>
            <form action={createMemoTabAction}>
              <Button type="submit" size="sm">
                <Plus className="h-4 w-4" /> Добавить вкладку
              </Button>
            </form>
          </div>

          {rows.length === 0 ? (
            <EmptyState
              title="Вкладок пока нет"
              description="Добавьте первую вкладку — откроется страница редактирования."
            />
          ) : (
            <MemosTabsTable
              rows={rows}
              reorderAction={reorderMemoTabsAction}
              moveAction={moveMemoTabAction}
              deleteAction={deleteMemoTabAction}
            />
          )}
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
      <div id="sec-callus" className="scroll-mt-4">
        <PageSectionsManager
          pageKey={pageKey}
          sections={sections}
          initialOrder={initialOrder}
          settings={settings}
          toggleKeys={toggleKeys}
          hideSidebar
          sectionTitles={sectionTitles}
          sectionSlots={{
            ...faqSlots,
            callus: (
              <p className="text-sm text-admin-fg-muted">
                Баннер «Есть вопросы?» внизу страницы. Текст — в{" "}
                <a href="/admin/settings" className="underline hover:text-admin-fg">
                  Настройках
                </a>
                .
              </p>
            ),
          }}
        />
      </div>
    </PageSettingsForm>
  )
}
