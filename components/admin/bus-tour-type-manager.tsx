"use client"

import { useActionState, useEffect, useRef, useState } from "react"
import { Plus, Pencil, Trash2, X } from "lucide-react"
import { saveBusTourTypeAction, deleteBusTourTypeAction } from "@/app/admin/bus-tour-type-actions"
import type { BusTourType } from "@/lib/types"
import {
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  Button,
  Input,
  Label,
  TableWrap,
  Thead,
  Th,
  Tbody,
  Td,
  Tr,
  IconButton,
} from "@/components/admin/ui"

export function BusTourTypeManager({ types }: { types: BusTourType[] }) {
  const [editing, setEditing] = useState<BusTourType | null>(null)
  const [state, action, pending] = useActionState(saveBusTourTypeAction, null)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset()
      setEditing(null)
    }
  }, [state])

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <Card>
        <CardHeader>
          <CardTitle>Типы автобусных туров</CardTitle>
        </CardHeader>
        <CardBody>
          {types.length === 0 ? (
            <p className="text-sm text-admin-fg-subtle">Типов пока нет. Добавьте первый — он появится в форме тура и в фильтре на сайте.</p>
          ) : (
            <TableWrap>
              <Thead>
                <tr>
                  <Th>Название</Th>
                  <Th actions className="sr-only">Действия</Th>
                </tr>
              </Thead>
              <Tbody>
                {types.map((t) => (
                  <Tr key={t.id}>
                    <Td className="font-medium">{t.name}</Td>
                    <Td actions>
                      <div className="flex items-center justify-end gap-1">
                        <IconButton type="button" onClick={() => setEditing(t)} aria-label="Редактировать">
                          <Pencil className="h-4 w-4" />
                        </IconButton>
                        <form action={deleteBusTourTypeAction}>
                          <input type="hidden" name="id" value={t.id} />
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
          <p className="mt-3 text-xs text-admin-fg-subtle">
            Значение пишется в тур как текст. При переименовании туры обновятся автоматически.
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between gap-3">
          <CardTitle>{editing ? "Правка типа" : "Новый тип"}</CardTitle>
          {editing ? (
            <IconButton type="button" onClick={() => setEditing(null)} aria-label="Отменить правку">
              <X className="h-4 w-4" />
            </IconButton>
          ) : null}
        </CardHeader>
        <CardBody>
          <form ref={formRef} action={action} className="space-y-4" key={editing?.id ?? "new"}>
            {editing ? <input type="hidden" name="id" value={editing.id} /> : null}
            {state?.error ? (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-admin-danger" role="alert">
                {state.error}
              </p>
            ) : null}
            <div>
              <Label htmlFor="busTourTypeName" required>
                Название
              </Label>
              <Input
                id="busTourTypeName"
                name="name"
                defaultValue={editing?.name}
                required
                placeholder="Экскурсионный тур"
              />
            </div>
            <Button type="submit" disabled={pending}>
              {pending ? "Сохранение…" : editing ? "Сохранить" : <><Plus className="h-4 w-4" /> Добавить</>}
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  )
}
