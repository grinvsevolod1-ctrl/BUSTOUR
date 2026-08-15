"use client"

import { Pencil, Trash2 } from "lucide-react"
import { ConfirmActionForm } from "@/components/admin/confirm-action-form"
import { DragHandle } from "@/components/admin/drag-reorder-control"
import { SortableTableBody } from "@/components/admin/reorder/sortable-collections"
import { SortOrderButtons } from "@/components/admin/sort-order-buttons"
import { IconButton, IconLink, TableWrap, Td, Th, Thead, Tr } from "@/components/admin/ui"
import { dictionarySlotNumber, type DictionaryAdminRow } from "@/lib/dictionary-page-cms"
import { cn } from "@/lib/utils"

type ActionFn = (f: FormData) => void | Promise<void>

export function DictionaryTabsTable({
  rows,
  reorderAction,
  moveAction,
  deleteAction,
}: {
  rows: DictionaryAdminRow[]
  reorderAction: ActionFn
  moveAction: ActionFn
  deleteAction: ActionFn
}) {
  return (
    <TableWrap>
      <Thead>
        <tr>
          <Th>Раздел</Th>
          <Th actions className="sr-only">Действия</Th>
        </tr>
      </Thead>
      <SortableTableBody
        action={reorderAction}
        items={rows.map((row) => ({
          id: dictionarySlotNumber(row.shortKey),
          label: row.label,
        }))}
      >
        {rows.map((row, index) => (
          <Tr key={row.shortKey} className={cn(!row.visible && "opacity-60")}>
            <Td>
              <div className="flex flex-wrap items-center gap-2">
                <DragHandle label={row.label} />
                <SortOrderButtons
                  action={moveAction}
                  id={dictionarySlotNumber(row.shortKey)}
                  isFirst={index === 0}
                  isLast={index === rows.length - 1}
                />
                <span className="font-medium text-admin-fg">{row.label}</span>
              </div>
            </Td>
            <Td actions>
              <div className="flex items-center justify-end gap-1">
                <IconLink
                  href={`/admin/pages/dictionary/${row.shortKey}`}
                  aria-label="Редактировать"
                >
                  <Pencil className="h-4 w-4" />
                </IconLink>
                <ConfirmActionForm
                  action={deleteAction}
                  title="Убрать раздел"
                  confirmLabel="Убрать"
                  message={`Убрать «${row.label}» из списка на сайте? Данные полей останутся в CMS.`}
                >
                  <input type="hidden" name="slot" value={row.shortKey} />
                  <IconButton type="submit" tone="danger" aria-label="Убрать">
                    <Trash2 className="h-4 w-4" />
                  </IconButton>
                </ConfirmActionForm>
              </div>
            </Td>
          </Tr>
        ))}
      </SortableTableBody>
    </TableWrap>
  )
}
