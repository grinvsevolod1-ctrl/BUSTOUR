import { Pencil, Archive, UserCircle2 } from "lucide-react"
import { getStaff } from "@/lib/queries"
import { getSettings, getBlocks, getFaqBlocksForPage } from "@/lib/cms"
import { pageSettingsGroups, type PageSection } from "@/lib/admin-config"
import { deleteStaffAction, moveStaffAction } from "@/app/admin/staff-actions"
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
import { ConfirmActionForm } from "@/components/admin/confirm-action-form"
import {
  ButtonLink,
  Td,
  Th,
  Tr,
  Thead,
  Tbody,
  TableWrap,
  IconButton,
  IconLink,
  EmptyState,
} from "@/components/admin/ui"

export default async function AdminStaffPage() {
  const pageKey = "staff"
  const [members, settings, pageFaqs] = await Promise.all([
    getStaff(),
    getSettings(),
    getFaqBlocksForPage(pageKey),
  ])
  const sections: PageSection[] = [
    { key: `${pageKey}.section.faq`, label: "Частые вопросы" },
    { key: `${pageKey}.section.callus`, label: "Перезвоните нам" },
  ]
  const defaultOrder = ["faq", "callus"]
  const sectionKeys = sections.map((section) => section.key.split(".section.")[1]!)
  const initialOrder = resolveInitialOrder(
    settings[`${pageKey}.sections.order`],
    defaultOrder,
    sectionKeys,
    ["faq", "callus"],
  )
  const sectionTitles = buildSectionTitles(pageKey, settings, [], initialOrder, pageFaqs)
  const faqSlots = buildFaqSlots(pageKey, initialOrder, pageFaqs)
  const faqFormIds = buildFaqFormIds(pageKey, initialOrder)
  const toggleKeys = sections.map((section) => section.key).join(",")
  const fields = pageSettingsGroups.staff.groups.flatMap((group) => group.fields)
  const workspaceGroups: EditorWorkspaceGroup[] = [
    {
      id: "main",
      label: "Основное",
      badge: fields.some((field) => Boolean(settings[field.key]?.trim())),
      anchorIds: ["general-settings"],
    },
    {
      id: "staff",
      label: "Сотрудники",
      badge: members.length > 0,
      anchorIds: ["staff-list"],
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
      title="Сотрудники"
      description={`Всего: ${members.length}`}
      pageHref="/company/staff"
      workspaceGroups={workspaceGroups}
      workspaceBeforeForm={
        <FormSection id="general-settings" title="Настройки страницы" collapsible={false}>
          <div className="space-y-4">
            {pageSettingsGroups.staff.groups.map((group) => (
              <div key={group.heading}>
                <h2 className="mb-2 text-sm font-medium text-admin-fg">{group.heading}</h2>
                <SectionFieldsForm fields={group.fields} settings={settings} />
              </div>
            ))}
          </div>
        </FormSection>
      }
      workspaceMidPanels={[
        <div key="staff-list" id="staff-list" className="scroll-mt-4 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-admin-fg">Список сотрудников</h2>
              <p className="text-xs text-admin-fg-muted">Всего: {members.length}</p>
            </div>
            <ButtonLink href="/admin/staff/new" variant="primary" size="sm">
              + Добавить
            </ButtonLink>
          </div>

          {members.length === 0 ? (
            <EmptyState
              title="Сотрудников пока нет"
              description="Добавьте первого сотрудника через кнопку добавить."
            />
          ) : (
            <TableWrap>
              <Thead>
                <tr>
                  <Th>ФИО</Th>
                  <Th>Должность</Th>
                  <Th>Телефон</Th>
                  <Th>Email</Th>
                  <Th actions>Действия</Th>
                </tr>
              </Thead>
              <Tbody>
                {members.map((m, index) => (
                  <Tr key={m.id}>
                    <Td>
                      <div className="flex items-center gap-2">
                        <SortOrderButtons
                          action={moveStaffAction}
                          id={m.id}
                          isFirst={index === 0}
                          isLast={index === members.length - 1}
                        />
                        {m.photo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={m.photo}
                            alt=""
                            className="h-8 w-8 shrink-0 rounded-full object-cover"
                          />
                        ) : (
                          <UserCircle2 className="h-8 w-8 shrink-0 text-admin-fg-subtle/40" strokeWidth={1} aria-hidden />
                        )}
                        <span className="font-medium text-admin-fg">{m.name}</span>
                      </div>
                    </Td>
                    <Td className="text-admin-fg-muted">{m.position || "—"}</Td>
                    <Td className="text-admin-fg-muted">{m.phone || "—"}</Td>
                    <Td className="text-admin-fg-muted">{m.email || "—"}</Td>
                    <Td actions>
                      <div className="flex items-center justify-end gap-1">
                        <IconLink href={`/admin/staff/${m.id}`} aria-label="Редактировать">
                          <Pencil className="h-4 w-4" />
                        </IconLink>
                        <ConfirmActionForm
                          action={deleteStaffAction}
                          title="В архив"
                          confirmLabel="В архив"
                          message={`Перенести сотрудника «${m.name}» в архив? Позже можно восстановить.`}
                        >
                          <input type="hidden" name="id" value={m.id} />
                          <IconButton type="submit" tone="danger" aria-label="В архив">
                            <Archive className="h-4 w-4" />
                          </IconButton>
                        </ConfirmActionForm>
                      </div>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </TableWrap>
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
              <a href="/admin/settings" className="underline hover:text-admin-fg">Настройках</a>.
            </p>
          ),
        }}
      />
    </PageSettingsForm>
  )
}
