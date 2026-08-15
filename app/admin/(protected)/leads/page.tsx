import { getLeads } from "@/lib/queries"
import { updateLeadStatusAction, deleteLeadAction } from "@/app/admin/actions"
import { Archive } from "lucide-react"
import { ConfirmActionForm } from "@/components/admin/confirm-action-form"
import {
  PageHeader,
  TableWrap,
  Thead,
  Th,
  Tbody,
  Td,
  Tr,
  IconButton,
  Select,
  Button,
  EmptyState,
} from "@/components/admin/ui"

const typeLabels: Record<string, string> = {
  callback: "Звонок",
  booking: "Бронь тура",
  contact: "Контакты",
  rental: "Аренда автобуса",
  rentbus: "Аренда автобуса",
}

const statuses = [
  { value: "new", label: "Новая" },
  { value: "in_progress", label: "В работе" },
  { value: "done", label: "Завершена" },
]

function formatDate(ts: number) {
  return new Date(ts).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default async function AdminLeadsPage() {
  const leads = await getLeads()
  const newCount = leads.filter((l) => l.status === "new").length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Заявки"
        description={`Всего: ${leads.length}${newCount ? ` · новых: ${newCount}` : ""}`}
      />

      {leads.length === 0 ? (
        <EmptyState title="Заявок пока нет" description="Заявки с форм сайта появятся здесь автоматически." />
      ) : (
        <TableWrap>
          <Thead>
            <tr>
              <Th>Дата</Th>
              <Th>Имя</Th>
              <Th>Телефон</Th>
              <Th>Тип</Th>
              <Th>Детали</Th>
              <Th>Статус</Th>
              <Th actions className="sr-only">Действия</Th>
            </tr>
          </Thead>
          <Tbody>
            {leads.map((lead) => (
              <Tr key={lead.id} className="align-top">
                <Td className="whitespace-nowrap text-admin-fg-muted">{formatDate(lead.createdAt)}</Td>
                <Td className="font-medium">{lead.name}</Td>
                <Td className="whitespace-nowrap">
                  <a href={`tel:${lead.phone.replace(/\D/g, "")}`} className="text-admin-fg hover:underline">
                    {lead.phone}
                  </a>
                  {lead.email ? <div className="text-xs text-admin-fg-muted">{lead.email}</div> : null}
                </Td>
                <Td>{typeLabels[lead.type] || lead.type}</Td>
                <Td className="max-w-[220px] text-admin-fg-muted">
                  {lead.tour ? <div className="font-medium text-admin-fg">{lead.tour}</div> : null}
                  {lead.message ? <div className="text-xs">{lead.message}</div> : null}
                </Td>
                <Td>
                  <form action={updateLeadStatusAction} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={lead.id} />
                    <Select name="status" defaultValue={lead.status} className="h-8 py-1 text-xs">
                      {statuses.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </Select>
                    <Button type="submit" size="sm" variant="secondary">
                      OK
                    </Button>
                  </form>
                </Td>
                <Td actions>
                  <ConfirmActionForm
                    action={deleteLeadAction}
                    title="В архив"
                    confirmLabel="В архив"
                    message={`Перенести заявку «${lead.name}» в архив?`}
                  >
                    <input type="hidden" name="id" value={lead.id} />
                    <IconButton type="submit" tone="danger" aria-label="В архив">
                      <Archive className="h-4 w-4" />
                    </IconButton>
                  </ConfirmActionForm>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </TableWrap>
      )}
    </div>
  )
}
