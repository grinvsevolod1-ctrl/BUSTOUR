import { Plus, Pencil, Archive, ExternalLink, EyeOff } from "lucide-react"
import { getTransfers } from "@/lib/queries"
import { getSettings } from "@/lib/cms"
import { deleteTransferAction, moveTransferAction } from "@/app/admin/actions"
import { PageHeader, ButtonLink, TableWrap, Thead, Th, Tbody, Td, Tr, IconButton, IconLink, EmptyState } from "@/components/admin/ui"
import { VisibilityToggle } from "@/components/admin/visibility-toggle"
import { ConfirmActionForm } from "@/components/admin/confirm-action-form"
import { SortOrderButtons } from "@/components/admin/sort-order-buttons"

export default async function AdminTransfersPage() {
  const [transfers, settings] = await Promise.all([getTransfers(), getSettings()])
  return (
    <div className="space-y-6">
      <PageHeader title="Трансферы" description={`Всего: ${transfers.length}`}>
        <ButtonLink href="/admin/transfers/new"><Plus className="h-4 w-4" /> Добавить трансфер</ButtonLink>
      </PageHeader>
      {transfers.length === 0 ? <EmptyState title="Трансферов пока нет" description="Добавьте первый трансфер." /> : (
        <TableWrap>
          <Thead><tr><Th>Название</Th><Th>Категория</Th><Th>Цена туда/обратно</Th><Th>Цена в одну сторону</Th><Th actions className="sr-only">Действия</Th></tr></Thead>
          <Tbody>{transfers.map((transfer, index) => {
            const visible = settings[`transfer:${transfer.slug}.visible`] !== "0"
            const isFirstInCategory = index === 0 || transfers[index - 1].category !== transfer.category
            const isLastInCategory = index === transfers.length - 1 || transfers[index + 1].category !== transfer.category
            return (
              <Tr key={transfer.id}>
                <Td className="font-medium"><div className="flex items-center gap-2"><SortOrderButtons action={moveTransferAction} id={transfer.id} isFirst={isFirstInCategory} isLast={isLastInCategory} /><span>{transfer.title}</span>{!visible ? <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] text-amber-700"><EyeOff className="h-3 w-3" /> Скрыт</span> : null}</div></Td>
                <Td className="text-admin-fg-muted">{transfer.category === "airport" ? "Трансфер в аэропорты" : "Индивидуальный"}</Td>
                <Td className="text-admin-fg-muted">{transfer.priceRoundTrip || "—"}</Td>
                <Td className="text-admin-fg-muted">{transfer.priceOneWay || "—"}</Td>
                <Td actions><div className="flex items-center justify-end gap-1">
                  <IconLink href={`/info/transfers/${transfer.slug}`} target="_blank" aria-label="Открыть на сайте"><ExternalLink className="h-4 w-4" /></IconLink>
                  <IconLink href={`/admin/transfers/${transfer.id}`} aria-label="Редактировать"><Pencil className="h-4 w-4" /></IconLink>
                  <VisibilityToggle settingKey={`transfer:${transfer.slug}.visible`} visible={visible} label={`трансфер «${transfer.title}»`} />
                  <ConfirmActionForm
                    action={deleteTransferAction}
                    title="В архив"
                    confirmLabel="В архив"
                    message={`Перенести трансфер «${transfer.title}» в архив? Позже можно восстановить.`}
                  >
                    <input type="hidden" name="id" value={transfer.id} />
                    <IconButton type="submit" tone="danger" aria-label="В архив"><Archive className="h-4 w-4" /></IconButton>
                  </ConfirmActionForm>
                </div></Td>
              </Tr>
            )
          })}</Tbody>
        </TableWrap>
      )}
    </div>
  )
}
