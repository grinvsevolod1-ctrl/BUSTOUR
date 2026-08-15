"use client"

import { useActionState, useEffect, useRef, useState } from "react"
import { Pencil, Trash2, X } from "lucide-react"
import { saveShortcodeAction, deleteShortcodeAction } from "@/app/admin/shortcode-actions"
import type { ShortcodeRow } from "@/lib/shortcodes"
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
import { useAdminDirtyForm } from "@/components/admin/use-admin-dirty-form"

export function ShortcodeManager({ items }: { items: ShortcodeRow[] }) {
  const [editing, setEditing] = useState<ShortcodeRow | null>(null)
  const [namePreview, setNamePreview] = useState("")
  const [state, action, pending] = useActionState(saveShortcodeAction, null)
  const formRef = useRef<HTMLFormElement>(null)
  const { markDirty, markClean, formInputHandlers } = useAdminDirtyForm({
    id: "shortcode-manager",
    label: "Шорткоды",
  })

  useEffect(() => {
    if (state?.ok) {
      markClean()
      formRef.current?.reset()
      setEditing(null)
      setNamePreview("")
    }
  }, [state, markClean])

  useEffect(() => {
    setNamePreview(editing?.name ?? "")
  }, [editing])

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <Card>
        <CardHeader>
          <CardTitle>Шорткоды</CardTitle>
        </CardHeader>
        <CardBody>
          {items.length === 0 ? (
            <p className="text-sm text-admin-fg-subtle">Пока пусто. Добавьте переменную справа.</p>
          ) : (
            <TableWrap>
              <Thead>
                <tr>
                  <Th>В тексте</Th>
                  <Th>Имя</Th>
                  <Th>Значение</Th>
                  <Th>Описание</Th>
                  <Th actions className="sr-only">Действия</Th>
                </tr>
              </Thead>
              <Tbody>
                {items.map((row) => (
                  <Tr key={row.id}>
                    <Td>
                      <code className="rounded bg-admin-muted px-1.5 py-0.5 font-mono text-sm text-sky-700">
                        [{row.name}]
                      </code>
                    </Td>
                    <Td className="font-medium">{row.name}</Td>
                    <Td className="max-w-[220px] truncate text-admin-fg-muted" title={row.value}>
                      {row.value}
                    </Td>
                    <Td className="text-admin-fg-muted">{row.description || "—"}</Td>
                    <Td actions>
                      <div className="flex items-center justify-end gap-1">
                        <IconButton type="button" onClick={() => setEditing(row)} aria-label="Редактировать">
                          <Pencil className="h-4 w-4" />
                        </IconButton>
                        <form action={deleteShortcodeAction}>
                          <input type="hidden" name="id" value={row.id} />
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
        </CardBody>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between gap-3">
          <CardTitle>{editing ? `Правка: ${editing.name}` : "Новый шорткод"}</CardTitle>
          {editing ? (
            <IconButton
              type="button"
              onClick={() => {
                setEditing(null)
                setNamePreview("")
                formRef.current?.reset()
              }}
              aria-label="Отменить правку"
            >
              <X className="h-4 w-4" />
            </IconButton>
          ) : null}
        </CardHeader>
        <CardBody>
          <form ref={formRef} action={action} className="space-y-4" {...formInputHandlers()}>
            {editing ? <input type="hidden" name="id" value={editing.id} /> : null}
            <div className="space-y-1.5">
              <Label htmlFor="sc-name">Имя</Label>
              <Input
                id="sc-name"
                name="name"
                defaultValue={editing?.name ?? ""}
                placeholder="Y"
                required
                onChange={(e) => setNamePreview(e.target.value.replace(/[^a-zA-Z0-9]/g, ""))}
              />
              <p className="text-xs text-admin-fg-subtle">
                В тексте будет{" "}
                <code className="rounded bg-admin-muted px-1 font-mono text-sky-700">
                  [{namePreview || "имя"}]
                </code>
                . Только латиница и цифры, без скобок.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sc-value">Значение</Label>
              <Input
                id="sc-value"
                name="value"
                defaultValue={editing?.value ?? ""}
                placeholder="2026"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sc-desc">Описание</Label>
              <Input
                id="sc-desc"
                name="description"
                defaultValue={editing?.description ?? ""}
                placeholder="Год сезона"
              />
            </div>
            {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
            <Button type="submit" disabled={pending}>
              {pending ? "Сохранение…" : editing ? "Сохранить" : "Добавить"}
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  )
}
