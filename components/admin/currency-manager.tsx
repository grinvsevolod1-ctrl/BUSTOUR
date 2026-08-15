"use client"

import { useActionState, useEffect, useRef, useState } from "react"
import { CircleCheck, LoaderCircle, Plus, Pencil, Trash2, X } from "lucide-react"
import { saveCurrencyAction, deleteCurrencyAction, refreshCurrencyRatesAction, moveCurrencyAction } from "@/app/admin/currency-actions"
import { SortOrderButtons } from "@/components/admin/sort-order-buttons"
import type { Currency } from "@/lib/types"
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
  Badge,
} from "@/components/admin/ui"
import { useAdminDirtyForm } from "@/components/admin/use-admin-dirty-form"
import { CurrencyIcon } from "@/components/currency/currency-icon"

export function CurrencyManager({ currencies, markupPercent = 0 }: { currencies: Currency[]; markupPercent?: number }) {
  const [editing, setEditing] = useState<Currency | null>(null)
  const [state, action, pending] = useActionState(saveCurrencyAction, null)
  const [refreshState, refreshAction, refreshPending] = useActionState(refreshCurrencyRatesAction, null)
  const formRef = useRef<HTMLFormElement>(null)
  const { markDirty, markClean, formInputHandlers } = useAdminDirtyForm({
    id: "currency-manager",
    label: "Валюты",
  })

  // Reset the form and exit edit mode after a successful save.
  useEffect(() => {
    if (state?.ok) {
      markClean()
      formRef.current?.reset()
      setEditing(null)
    }
  }, [state, markClean])
  useEffect(() => {
    if (refreshState?.ok) markClean()
  }, [refreshState?.ok, markClean])

  const base = currencies.find((c) => c.isBase)

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <Card>
        <CardHeader>
          <CardTitle>Валюты</CardTitle>
        </CardHeader>
        <CardBody>
          <form action={refreshAction} className="mb-4 rounded-lg border border-admin-border bg-admin-muted/30 p-4" {...formInputHandlers()}>
            <div className="mb-3">
              <p className="text-sm font-semibold text-admin-fg">Синхронизация с Национальным банком</p>
              <p className="mt-1 text-xs text-admin-fg-muted">
                Получаем официальные курсы всех небазовых валют из таблицы, применяем наценку и записываем курс к базовой валюте.
              </p>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-[180px] flex-1">
                <Label htmlFor="markupPercent">Наценка, %</Label>
                <Input id="markupPercent" name="markupPercent" type="number" min="0" step="0.01" defaultValue={markupPercent} placeholder="2" />
              </div>
              <Button type="submit" variant="secondary" disabled={refreshPending}>
                {refreshPending ? "Обновление…" : "Обновить курсы по НБРБ"}
              </Button>
            </div>
            {refreshPending ? (
              <p className="mt-3 flex items-center gap-2 text-sm text-admin-fg-muted" role="status">
                <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> Запрашиваем НБРБ и сохраняем курсы…
              </p>
            ) : refreshState?.error ? (
              <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-admin-danger" role="alert">{refreshState.error}</p>
            ) : null}
            {refreshState?.success ? (
              <div className="mt-3 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800" role="status">
                <p className="flex items-center gap-2 font-semibold"><CircleCheck className="h-4 w-4" aria-hidden />{refreshState.success}</p>
                {refreshState.details ? (
                  <ul className="mt-2 space-y-1 text-xs">
                    {Object.entries(refreshState.details.commercialRates).map(([code, rate]) => (
                      <li key={code}>
                        {code}: {refreshState.details?.officialRates[code]} + {refreshState.details?.markupPercent}%
                        {" "}({refreshState.details?.markupAmounts[code]}) = {rate} · курс НБРБ на {refreshState.details?.asOfDates[code] || "текущую дату"}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
          </form>
          {currencies.length === 0 ? (
            <p className="text-sm text-admin-fg-subtle">Валют пока нет. Добавьте первую — она станет базовой.</p>
          ) : (
            <TableWrap>
              <Thead>
                <tr>
                  <Th>Код</Th>
                  <Th>Название</Th>
                  <Th>Символ</Th>
                  <Th>Курс к базовой</Th>
                  <Th actions className="sr-only">Действия</Th>
                </tr>
              </Thead>
              <Tbody>
                {currencies.map((c, index) => (
                  <Tr key={c.id}>
                    <Td className="font-medium">
                      <div className="flex items-center gap-2">
                        <SortOrderButtons
                          action={moveCurrencyAction}
                          id={c.id}
                          isFirst={index === 0}
                          isLast={index === currencies.length - 1}
                        />
                        <span className="inline-flex items-center gap-1.5">
                          <CurrencyIcon code={c.code} className="h-4 w-4 text-admin-fg-muted" />
                          {c.code}
                        </span>
                        {c.isBase ? <Badge tone="blue">базовая</Badge> : null}
                      </div>
                    </Td>
                    <Td className="text-admin-fg-muted">{c.label}</Td>
                    <Td className="text-admin-fg-muted">{c.symbol || c.code}</Td>
                    <Td className="text-admin-fg-muted">{c.isBase ? "1 (базовая)" : c.rate}</Td>
                    <Td actions>
                      <div className="flex items-center justify-end gap-1">
                        <IconButton type="button" onClick={() => setEditing(c)} aria-label="Редактировать">
                          <Pencil className="h-4 w-4" />
                        </IconButton>
                        <form action={deleteCurrencyAction}>
                          <input type="hidden" name="id" value={c.id} />
                          <IconButton type="submit" tone="danger" aria-label="Удалить" disabled={c.isBase}>
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
          {base ? (
            <p className="mt-3 text-xs text-admin-fg-subtle">
              Цена туров задаётся в базовой валюте ({base.code}); остальные пересчитываются по курсу.
            </p>
          ) : null}
        </CardBody>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between gap-3">
          <CardTitle>{editing ? `Правка: ${editing.code}` : "Новая валюта"}</CardTitle>
          {editing ? (
            <IconButton type="button" onClick={() => setEditing(null)} aria-label="Отменить правку">
              <X className="h-4 w-4" />
            </IconButton>
          ) : null}
        </CardHeader>
        <CardBody>
          <form ref={formRef} action={action} className="space-y-4" key={editing?.id ?? "new"} {...formInputHandlers()}>
            {editing ? <input type="hidden" name="id" value={editing.id} /> : null}
            {state?.error ? (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-admin-danger" role="alert">
                {state.error}
              </p>
            ) : null}
            <p className="text-xs text-admin-fg-muted">* — обязательные поля</p>
            <div>
              <Label htmlFor="code" required>Код</Label>
              <Input id="code" name="code" defaultValue={editing?.code} required placeholder="USD" maxLength={5} />
            </div>
            <div>
              <Label htmlFor="label">Название</Label>
              <Input id="label" name="label" defaultValue={editing?.label} placeholder="Доллар США" />
            </div>
            <div>
              <Label htmlFor="symbol">Символ для цен</Label>
              <Input id="symbol" name="symbol" defaultValue={editing?.symbol} placeholder="$" maxLength={8} />
            </div>
            <div>
              <Label htmlFor="rate">Курс (сколько за 1 единицу базовой)</Label>
              <Input
                id="rate"
                name="rate"
                type="number"
                step="0.0001"
                min="0"
                defaultValue={editing?.rate ?? ""}
                placeholder="0.3"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-admin-fg">
              <input
                type="checkbox"
                name="isBase"
                defaultChecked={editing?.isBase}
                className="h-4 w-4 rounded border-admin-border"
              />
              Базовая валюта (курс = 1)
            </label>
            <Button type="submit" disabled={pending}>
              {pending ? "Сохранение…" : editing ? "Сохранить" : <><Plus className="h-4 w-4" /> Добавить</>}
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  )
}
