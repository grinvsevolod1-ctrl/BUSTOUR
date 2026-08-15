import Link from "next/link"
import { Pencil, Trash2, Plus, FolderOpen } from "lucide-react"
import { getCertSectionsWithItems } from "@/lib/queries"
import { getSettings, getBlocks, getFaqBlocksForPage } from "@/lib/cms"
import { pageSettingsGroups, type PageSection } from "@/lib/admin-config"
import { deleteCertSectionAction, deleteCertificateAction, moveCertSectionAction, moveCertificateAction } from "@/app/admin/cert-actions"
import { SortOrderButtons } from "@/components/admin/sort-order-buttons"
import { buildFaqSlots } from "@/components/admin/build-faq-slots"
import { PageSettingsForm } from "@/components/admin/page-settings-form"
import { PageSectionsManager } from "@/components/admin/page-sections-manager"
import { EditorWorkspaceGroup } from "@/components/admin/editor-workspace"
import { FormSection } from "@/components/admin/ui"
import { SectionFieldsForm } from "@/components/admin/section-fields-form"
import { buildSectionTitles } from "@/lib/section-titles"
import { resolveInitialOrder } from "@/lib/section-order"
import { buildFaqFormIds } from "@/lib/faq-slots"
import {
  Card,
  ButtonLink,
  IconLink,
  IconButton,
  Badge,
  EmptyState,
  TableWrap,
  Thead,
  Th,
  Tbody,
  Td,
  Tr,
} from "@/components/admin/ui"

export default async function AdminLicensesPage() {
  const pageKey = "licenses"
  const [sections, settings, pageFaqs] = await Promise.all([
    getCertSectionsWithItems(),
    getSettings(),
    getFaqBlocksForPage(pageKey),
  ])
  const totalCerts = sections.reduce((s, sec) => s + sec.items.length, 0)
  const page = pageSettingsGroups.licenses
  const pageSections: PageSection[] = [
    { key: `${pageKey}.section.faq`, label: "Частые вопросы" },
    { key: `${pageKey}.section.callus`, label: "Перезвоните нам" },
  ]
  const defaultOrder = ["faq", "callus"]
  const sectionKeys = pageSections.map((section) => section.key.split(".section.")[1]!)
  const initialOrder = resolveInitialOrder(settings[`${pageKey}.sections.order`], defaultOrder, sectionKeys, ["faq", "callus"])
  const sectionTitles = buildSectionTitles(pageKey, settings, [], initialOrder, pageFaqs)
  const faqSlots = buildFaqSlots(pageKey, initialOrder, pageFaqs)
  const faqFormIds = buildFaqFormIds(pageKey, initialOrder)
  const toggleKeys = pageSections.map((section) => section.key).join(",")
  const fields = page.groups.flatMap((group) => group.fields)
  const workspaceGroups: EditorWorkspaceGroup[] = [
    {
      id: "main",
      label: "Основное",
      badge: fields.some((field) => Boolean(settings[field.key]?.trim())),
      anchorIds: ["general-settings"],
    },
    {
      id: "licenses",
      label: "Документы",
      badge: sections.length > 0,
      anchorIds: ["licenses-list"],
    },
    {
      id: "content",
      label: "Контент",
      badge: pageFaqs.length > 0,
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
      title="Лицензии и сертификаты"
      description={`Разделов: ${sections.length} · Документов: ${totalCerts}`}
      pageHref="/company/licenses"
      workspaceGroups={workspaceGroups}
      workspaceBeforeForm={
        <FormSection id="general-settings" title="Настройки страницы" collapsible={false}>
          {page.groups.map((group) => (
            <div key={group.heading}>
              <h2 className="mb-2 text-sm font-medium text-admin-fg">{group.heading}</h2>
              <SectionFieldsForm fields={group.fields} settings={settings} />
            </div>
          ))}
        </FormSection>
      }
      workspaceMidPanels={[
        <div key="licenses-list" id="licenses-list" className="scroll-mt-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-admin-fg">Разделы и документы</h2>
              <p className="text-xs text-admin-fg-muted">
                Разделов: {sections.length} · Документов: {totalCerts}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <ButtonLink href="/admin/licenses/section/new" size="sm">
                <Plus className="h-4 w-4" />
                Добавить раздел
              </ButtonLink>
              <ButtonLink href="/admin/licenses/certificate/new" variant="secondary" size="sm">
                <Plus className="h-4 w-4" />
                Добавить документ
              </ButtonLink>
            </div>
          </div>

          {sections.length === 0 ? (
            <EmptyState
              title="Разделы пока не созданы"
              description="Создайте раздел (например «Лицензии»), затем добавьте в него документы."
            />
          ) : (
            <div className="space-y-8">
              {sections.map((section, sectionIndex) => (
                <div key={section.id} className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <SortOrderButtons
                        action={moveCertSectionAction}
                        id={section.id}
                        isFirst={sectionIndex === 0}
                        isLast={sectionIndex === sections.length - 1}
                      />
                      <FolderOpen className="h-4 w-4 shrink-0 text-admin-fg-subtle" />
                      <h2 className="text-sm font-semibold text-admin-fg">{section.title}</h2>
                      <Badge tone="neutral">{section.items.length}</Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      <IconLink href={`/admin/licenses/section/${section.id}`} aria-label="Редактировать раздел">
                        <Pencil className="h-4 w-4" />
                      </IconLink>
                      <form action={deleteCertSectionAction}>
                        <input type="hidden" name="id" value={section.id} />
                        <IconButton
                          type="submit"
                          tone="danger"
                          aria-label="Удалить раздел и все его документы"
                          title="Удалит раздел вместе со всеми документами"
                        >
                          <Trash2 className="h-4 w-4" />
                        </IconButton>
                      </form>
                    </div>
                  </div>

                  {section.items.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-admin-border bg-admin-muted/30 px-4 py-4 text-sm text-admin-fg-muted">
                      В этом разделе ещё нет документов.{" "}
                      <Link
                        href={`/admin/licenses/certificate/new?sectionId=${section.id}`}
                        className="text-brand hover:underline"
                      >
                        Добавить
                      </Link>
                    </p>
                  ) : (
                    <TableWrap>
                      <Thead>
                        <Tr>
                          <Th>Название</Th>
                          <Th className="hidden md:table-cell">Описание</Th>
                          <Th actions>Действия</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {section.items.map((cert, certIndex) => (
                          <Tr key={cert.id}>
                            <Td className="font-medium">
                              <div className="flex items-center gap-2">
                                <SortOrderButtons
                                  action={moveCertificateAction}
                                  id={cert.id}
                                  isFirst={certIndex === 0}
                                  isLast={certIndex === section.items.length - 1}
                                />
                                <span>{cert.name}</span>
                              </div>
                            </Td>
                            <Td className="hidden max-w-xs md:table-cell">
                              <span className="line-clamp-2 text-admin-fg-muted">{cert.description}</span>
                            </Td>
                            <Td actions>
                              <div className="flex items-center justify-end gap-1">
                                <IconLink
                                  href={`/admin/licenses/certificate/${cert.id}`}
                                  aria-label="Редактировать"
                                >
                                  <Pencil className="h-4 w-4" />
                                </IconLink>
                                <form action={deleteCertificateAction}>
                                  <input type="hidden" name="id" value={cert.id} />
                                  <IconButton type="submit" tone="danger" aria-label="Удалить">
                                    <Trash2 className="h-4 w-4" />
                                  </IconButton>
                                </form>
                              </div>
                            </Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </TableWrap>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>,
      ]}
      workspaceAfterForm={
        <div id="sec-order" className="scroll-mt-4">
          <PageSectionsManager
            pageKey={pageKey}
            sections={pageSections}
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
        sections={pageSections}
        initialOrder={initialOrder}
        settings={settings}
        toggleKeys={toggleKeys}
        hideSidebar
        sectionSlots={{
          ...faqSlots,
          callus: (
            <p className="text-sm text-admin-fg-muted">
              Баннер «Перезвоните нам» отображается внизу страницы. Текст и кнопку можно изменить в{" "}
              <a href="/admin/settings" className="underline hover:text-admin-fg">Настройках</a>.
            </p>
          ),
        }}
      />
    </PageSettingsForm>
  )
}
