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
import { DictionaryTabsTable } from "@/components/admin/dictionary-tabs-table"
import { buildSectionTitles } from "@/lib/section-titles"
import { resolveInitialOrder } from "@/lib/section-order"
import { buildFaqFormIds } from "@/lib/faq-slots"
import {
  DICTIONARY_PAGE_CMS_KEY,
  DICTIONARY_PAGE_SECTIONS_DEFAULT,
  dictionaryAdminRows,
  resolveDictionaryTabsOrder,
} from "@/lib/dictionary-page-cms"
import {
  createDictionaryTabAction,
  deleteDictionaryTabAction,
  moveDictionaryTabAction,
  reorderDictionaryTabsAction,
} from "@/app/admin/cms-actions"

export const metadata: Metadata = { title: "Туристический словарь — Админ-панель" }

export default async function DictionaryAdminPage() {
  const pageKey = DICTIONARY_PAGE_CMS_KEY
  const page = pageSettingsGroups.dictionary
  const sections: PageSection[] = [
    { key: `${pageKey}.section.faq`, label: "Частые вопросы" },
    { key: `${pageKey}.section.callus`, label: "Перезвоните нам" },
  ]
  const [settings, faqBlocks] = await Promise.all([
    getSettings(),
    getFaqBlocksForPage(pageKey),
  ])
  const defaultOrder = [...DICTIONARY_PAGE_SECTIONS_DEFAULT]
  const sectionKeys = sections.map((s) => s.key.split(".section.")[1]!).filter(Boolean)
  const initialOrder = resolveInitialOrder(
    settings[`${pageKey}.sections.order`],
    defaultOrder,
    sectionKeys,
    ["faq", "callus"],
  ).filter((k) => !k.startsWith("term"))
  const sectionTitles = buildSectionTitles(pageKey, settings, [], initialOrder, faqBlocks)
  const faqSlots = buildFaqSlots(pageKey, initialOrder, faqBlocks)
  const faqFormIds = buildFaqFormIds(pageKey, initialOrder)
  const toggleKeys = sections.map((section) => section.key).join(",")
  const baseFields = page.groups.flatMap((group) => group.fields)
  const hasSettings = (keys: string[]) => keys.some((key) => Boolean(settings[key]?.trim()))
  const tabOrder = resolveDictionaryTabsOrder(settings)
  const rows = dictionaryAdminRows(settings, tabOrder)

  const workspaceGroups: EditorWorkspaceGroup[] = [
    {
      id: "main",
      label: "Основное",
      badge: hasSettings(baseFields.map((f) => f.key)),
      anchorIds: ["page-settings"],
    },
    {
      id: "tabs",
      label: "Разделы",
      badge: rows.length > 0,
      anchorIds: ["dictionary-list"],
    },
    {
      id: "content",
      label: "Контент",
      badge: faqBlocks.length > 0 || initialOrder.includes("callus"),
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
    <PageSettingsForm
      title={page.heading}
      description="SEO, шапка и список разделов словаря (аккордеон на сайте). Редактирование раздела — на отдельной странице."
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
        <div key="dictionary-list" id="dictionary-list" className="scroll-mt-4 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-admin-fg">Разделы словаря</h2>
              <p className="text-xs text-admin-fg-muted">Всего: {rows.length}</p>
            </div>
            <form action={createDictionaryTabAction}>
              <Button type="submit" size="sm">
                <Plus className="h-4 w-4" /> Добавить раздел
              </Button>
            </form>
          </div>

          {rows.length === 0 ? (
            <EmptyState
              title="Разделов пока нет"
              description="Добавьте первый раздел — откроется страница редактирования."
            />
          ) : (
            <DictionaryTabsTable
              rows={rows}
              reorderAction={reorderDictionaryTabsAction}
              moveAction={moveDictionaryTabAction}
              deleteAction={deleteDictionaryTabAction}
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
              Баннер «Перезвоните нам» отображается внизу страницы. Текст и кнопку можно изменить в{" "}
              <a href="/admin/settings" className="underline hover:text-admin-fg">
                Настройках
              </a>
              .
            </p>
          ),
        }}
      />
    </PageSettingsForm>
  )
}
