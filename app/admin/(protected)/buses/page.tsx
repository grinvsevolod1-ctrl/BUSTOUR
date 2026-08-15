import { Plus, Pencil, Archive, ExternalLink, EyeOff } from "lucide-react"
import { getBuses } from "@/lib/queries"
import { getSettings } from "@/lib/cms"
import { deleteBusAction, moveBusAction } from "@/app/admin/actions"
import {
  PageHeader,
  ButtonLink,
  TableWrap,
  Thead,
  Th,
  Tbody,
  Td,
  Tr,
  IconButton,
  IconLink,
  EmptyState,
} from "@/components/admin/ui"
import { VisibilityToggle } from "@/components/admin/visibility-toggle"
import { ConfirmActionForm } from "@/components/admin/confirm-action-form"
import { SortOrderButtons } from "@/components/admin/sort-order-buttons"

export default async function AdminBusesPage() {
  const [buses, settings] = await Promise.all([getBuses(), getSettings()])

  return (
    <div className="space-y-6">
      <PageHeader title="Автобусный парк" description={`Всего: ${buses.length}`}>
        <ButtonLink href="/admin/buses/new">
          <Plus className="h-4 w-4" /> Добавить автобус
        </ButtonLink>
      </PageHeader>

      {buses.length === 0 ? (
        <EmptyState title="Автобусов пока нет" description="Добавьте первый автобус, чтобы он появился в парке." />
      ) : (
        <TableWrap>
          <Thead>
            <tr>
              <Th>Название</Th>
              <Th>Год</Th>
              <Th>Мест</Th>
              <Th>Класс</Th>
              <Th actions className="sr-only">Действия</Th>
            </tr>
          </Thead>
          <Tbody>
            {buses.map((bus, index) => {
              const visible = settings[`bus:${bus.slug}.visible`] !== "0"
              return (
                <Tr key={bus.id}>
                  <Td className="font-medium">
                    <div className="flex items-center gap-2">
                      <SortOrderButtons
                        action={moveBusAction}
                        id={bus.id}
                        isFirst={index === 0}
                        isLast={index === buses.length - 1}
                      />
                      <span>{bus.title}</span>
                      {!visible && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                          <EyeOff className="h-3 w-3" />
                          Скрыт
                        </span>
                      )}
                    </div>
                  </Td>
                  <Td className="text-admin-fg-muted">{bus.year || "—"}</Td>
                  <Td className="text-admin-fg-muted">{bus.seats || "—"}</Td>
                  <Td className="text-admin-fg-muted">{bus.busClass || "—"}</Td>
                  <Td actions>
                    <div className="flex items-center justify-end gap-1">
                      <IconLink href={`/bus-rental/${bus.slug}`} target="_blank" aria-label="Открыть на сайте">
                        <ExternalLink className="h-4 w-4" />
                      </IconLink>
                      <IconLink href={`/admin/buses/${bus.id}`} aria-label="Редактировать">
                        <Pencil className="h-4 w-4" />
                      </IconLink>
                      <VisibilityToggle
                        settingKey={`bus:${bus.slug}.visible`}
                        visible={visible}
                        label={`автобус «${bus.title}»`}
                      />
                      <ConfirmActionForm
                        action={deleteBusAction}
                        title="В архив"
                        confirmLabel="В архив"
                        message={`Перенести автобус «${bus.title}» в архив? Позже можно восстановить.`}
                      >
                        <input type="hidden" name="id" value={bus.id} />
                        <IconButton type="submit" tone="danger" aria-label="В архив">
                          <Archive className="h-4 w-4" />
                        </IconButton>
                      </ConfirmActionForm>
                    </div>
                  </Td>
                </Tr>
              )
            })}
          </Tbody>
        </TableWrap>
      )}
    </div>
  )
}
