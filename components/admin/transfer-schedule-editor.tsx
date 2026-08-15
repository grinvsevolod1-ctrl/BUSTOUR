"use client"

import { useActionState, useContext, useEffect, useRef, useState } from "react"
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react"
import { saveTransferSchedulesAction } from "@/app/admin/actions"
import { PageSettingsFormContext } from "@/components/admin/page-settings-form"
import { PublicTableColHeader } from "@/components/admin/public-table-col-header"
import { SectionFieldsForm } from "@/components/admin/section-fields-form"
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Input,
  TableWrap,
  Tbody,
  Td,
  Textarea,
  Th,
  Thead,
  Tr,
} from "@/components/admin/ui"
import {
  TRANSFER_SCHEDULE_DEFAULT_TITLES,
  transferScheduleCmsKeys,
} from "@/lib/transfer-display"
import {
  DEFAULT_TRANSFER_SCHEDULE_COL_WIDTHS,
  resolveTransferScheduleColWidths,
  serializePublicColWidths,
  type PublicColWidth,
  type TransferScheduleColId,
} from "@/lib/public-table-col-widths"
import { plainCmsText } from "@/lib/cms-public-text"
import type { TransferDirection, TransferSchedule } from "@/lib/types"

type Row = { departureTime: string; arrival: string; note: string; bookingHref: string }

function toRows(items: TransferSchedule[]): Row[] {
  return items.map(({ departureTime, arrival, note, bookingHref }) => ({
    departureTime,
    arrival,
    note,
    bookingHref,
  }))
}

/** Normalize time for input[type=time] (HH:mm). */
function toTimeValue(raw: string): string {
  const m = String(raw).trim().match(/^(\d{1,2}):(\d{2})/)
  if (!m) return ""
  return `${m[1]!.padStart(2, "0")}:${m[2]}`
}

export function TransferScheduleEditor({
  transferId,
  direction,
  schedules,
  pageKey,
  settings,
  hideCardTitle = false,
}: {
  transferId: number
  direction: TransferDirection
  schedules: TransferSchedule[]
  pageKey?: string
  settings?: Record<string, string>
  hideCardTitle?: boolean
}) {
  const [rows, setRows] = useState<Row[]>(toRows(schedules))
  const [state, action, pending] = useActionState(saveTransferSchedulesAction, null)
  const formRef = useRef<HTMLFormElement>(null)
  const baselineRef = useRef(JSON.stringify({ rows: toRows(schedules), colWidths: resolveTransferScheduleColWidths(null) }))
  const register = useContext(PageSettingsFormContext)
  const cms = pageKey ? transferScheduleCmsKeys(pageKey, direction) : null
  const defaultTitle = TRANSFER_SCHEDULE_DEFAULT_TITLES[direction]
  const cardLabel = direction === "outbound" ? "Из Минска в аэропорт" : "Из аэропорта в Минск"
  const [colWidths, setColWidths] = useState(() =>
    resolveTransferScheduleColWidths(cms && settings ? settings[cms.colWidths] : null),
  )

  useEffect(() => {
    if (!register) return
    return register.registerDraft({
      id: `transfer-schedule:${transferId}:${direction}`,
      label: cardLabel,
      isDirty: () => JSON.stringify({ rows, colWidths }) !== baselineRef.current,
      async save() {
        const form = formRef.current
        if (!form) return { ok: true }
        const result = await saveTransferSchedulesAction(null, new FormData(form))
        if (result && "error" in result) return { ok: false, error: String(result.error) }
        return { ok: true }
      },
      commitBaseline() { baselineRef.current = JSON.stringify({ rows, colWidths }) },
      reset() { formRef.current?.reset() },
    })
  }, [cardLabel, colWidths, direction, register, rows, transferId])

  const setCol = (id: TransferScheduleColId, next: PublicColWidth) =>
    setColWidths((current) => ({ ...current, [id]: next }))
  const resetColWidths = () => setColWidths({ ...DEFAULT_TRANSFER_SCHEDULE_COL_WIDTHS })

  const update = (index: number, key: keyof Row, value: string) =>
    setRows((current) => current.map((row, i) => (i === index ? { ...row, [key]: value } : row)))
  const move = (index: number, delta: -1 | 1) => {
    const next = index + delta
    if (next < 0 || next >= rows.length) return
    setRows((current) => {
      const copy = [...current]
      ;[copy[index], copy[next]] = [copy[next], copy[index]]
      return copy
    })
  }
  const addRow = () =>
    setRows((current) => [...current, { departureTime: "", arrival: "", note: "", bookingHref: "" }])
  const removeRow = (index: number) =>
    setRows((current) => current.filter((_, i) => i !== index))

  return (
    <Card>
      {!hideCardTitle ? (
        <CardHeader>
          <CardTitle>{cardLabel}</CardTitle>
        </CardHeader>
      ) : null}
      <CardBody className="space-y-3">
        {cms && settings ? (
          <div className="space-y-2 rounded-lg border border-admin-border bg-admin-muted/30 p-3">
            <SectionFieldsForm
              hideSubmit
              settings={settings}
              fields={[
                {
                  key: cms.title,
                  label: "Заголовок таблицы",
                  placeholder: defaultTitle,
                  hint: "Пусто = плейсхолдер по умолчанию на сайте.",
                },
                {
                  key: cms.beforeHtml,
                  label: "Текст под заголовком",
                  type: "richtext",
                  collapseEmpty: true,
                  hint: "Не заполнен — блок не показывается на сайте.",
                },
              ]}
            />
          </div>
        ) : null}

        <form ref={formRef} id={`transfer-schedule-${transferId}-${direction}`} action={action}>
          <input type="hidden" name="transferId" value={transferId} />
          <input type="hidden" name="direction" value={direction} />
          <input type="hidden" name="rows" value={JSON.stringify(rows)} readOnly />
        </form>

        {cms && register ? (
          <input
            type="hidden"
            name={cms.colWidths}
            form={register.formId}
            value={serializePublicColWidths(colWidths)}
            readOnly
          />
        ) : null}

        {/* Desktop dense table — gear in headers edits public site column widths */}
        <div className="hidden md:block">
          {cms ? (
            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] text-admin-fg-muted">
                Шестерёнка — ширина колонки на сайте (по умолчанию: поля fill, «Бронь» hug). После
                смены нажмите «Сохранить» в шапке, затем откройте страницу трансфера на lg+.
              </p>
              <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={resetColWidths}>
                Сбросить ширины
              </Button>
            </div>
          ) : null}
          <TableWrap className="text-sm">
            <Thead>
              <Tr className="hover:bg-transparent">
                <Th actions className="w-10">
                  #
                </Th>
                <Th className="w-28 normal-case tracking-normal">
                  {cms ? (
                    <PublicTableColHeader
                      label="Отправление"
                      value={colWidths.departure}
                      onChange={(next) => setCol("departure", next)}
                    />
                  ) : (
                    "Отправление"
                  )}
                </Th>
                <Th className="w-28 normal-case tracking-normal">
                  {cms ? (
                    <PublicTableColHeader
                      label="Прибытие"
                      value={colWidths.arrival}
                      onChange={(next) => setCol("arrival", next)}
                    />
                  ) : (
                    "Прибытие"
                  )}
                </Th>
                <Th className="min-w-[180px] normal-case tracking-normal">
                  {cms ? (
                    <PublicTableColHeader
                      label="Примечание"
                      value={colWidths.note}
                      onChange={(next) => setCol("note", next)}
                    />
                  ) : (
                    "Примечание"
                  )}
                </Th>
                <Th className="w-44 normal-case tracking-normal">
                  {cms ? (
                    <PublicTableColHeader
                      label="Ссылка бронирования"
                      value={colWidths.booking}
                      onChange={(next) => setCol("booking", next)}
                    />
                  ) : (
                    "Ссылка бронирования"
                  )}
                </Th>
                <Th actions className="sr-only">
                  Удалить
                </Th>
              </Tr>
            </Thead>
            <Tbody>
              {rows.map((row, index) => (
                <Tr key={index} className={index % 2 ? "bg-cream/30 hover:bg-cream/40" : "bg-white"}>
                  <Td actions className="p-1.5">
                    <div className="flex flex-col items-center gap-0">
                      <button
                        type="button"
                        className="p-0.5 disabled:opacity-30"
                        onClick={() => move(index, -1)}
                        disabled={index === 0}
                        aria-label="Выше"
                      >
                        <ChevronUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        className="p-0.5 disabled:opacity-30"
                        onClick={() => move(index, 1)}
                        disabled={index === rows.length - 1}
                        aria-label="Ниже"
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </Td>
                  <Td className="p-1.5">
                    <Input
                      type="time"
                      className="h-8 py-1 text-sm"
                      value={toTimeValue(row.departureTime)}
                      onChange={(e) => update(index, "departureTime", e.target.value)}
                    />
                  </Td>
                  <Td className="p-1.5">
                    <Input
                      type="time"
                      className="h-8 py-1 text-sm"
                      value={toTimeValue(row.arrival)}
                      onChange={(e) => update(index, "arrival", e.target.value)}
                    />
                  </Td>
                  <Td className="p-1.5">
                    <Input
                      className="h-8 py-1 text-sm"
                      value={row.note}
                      onChange={(e) => update(index, "note", e.target.value)}
                      placeholder="Под прилёты до 00:00"
                    />
                  </Td>
                  <Td className="p-1.5">
                    <Input
                      className="h-8 py-1 text-sm"
                      value={row.bookingHref}
                      onChange={(e) => update(index, "bookingHref", e.target.value)}
                      placeholder="URL или пусто"
                    />
                  </Td>
                  <Td actions className="p-1.5">
                    <button
                      type="button"
                      onClick={() => removeRow(index)}
                      className="text-admin-fg-muted hover:text-red-600"
                      title="Удалить"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </TableWrap>
        </div>

        {/* Mobile cards — no horizontal page scroll at 320 */}
        <div className="space-y-2 md:hidden">
          {rows.map((row, index) => (
            <div
              key={index}
              className="space-y-2 rounded-lg border border-admin-border bg-white p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-admin-fg-muted">Рейс {index + 1}</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className="rounded p-1.5 disabled:opacity-30"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    aria-label="Выше"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="rounded p-1.5 disabled:opacity-30"
                    onClick={() => move(index, 1)}
                    disabled={index === rows.length - 1}
                    aria-label="Ниже"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeRow(index)}
                    className="rounded p-1.5 text-admin-fg-muted hover:text-red-600"
                    aria-label="Удалить"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-0.5 block text-[11px] text-admin-fg-muted">Отправление</label>
                  <Input
                    type="time"
                    className="h-9 text-sm"
                    value={toTimeValue(row.departureTime)}
                    onChange={(e) => update(index, "departureTime", e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-0.5 block text-[11px] text-admin-fg-muted">Прибытие</label>
                  <Input
                    type="time"
                    className="h-9 text-sm"
                    value={toTimeValue(row.arrival)}
                    onChange={(e) => update(index, "arrival", e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="mb-0.5 block text-[11px] text-admin-fg-muted">Примечание</label>
                <Textarea
                  className="min-h-[56px] text-sm"
                  rows={2}
                  value={row.note}
                  onChange={(e) => update(index, "note", e.target.value)}
                  placeholder="Под прилёты до 00:00"
                />
              </div>
              <div>
                <label className="mb-0.5 block text-[11px] text-admin-fg-muted">Ссылка</label>
                <Input
                  className="h-9 text-sm"
                  value={row.bookingHref}
                  onChange={(e) => update(index, "bookingHref", e.target.value)}
                  placeholder="URL или пусто"
                />
              </div>
            </div>
          ))}
        </div>

        <Button type="button" variant="secondary" size="sm" className="h-9" onClick={addRow}>
          <Plus className="h-4 w-4" /> Добавить строку
        </Button>

        {cms && settings ? (
          <details className="group rounded-lg border border-admin-border bg-admin-muted/30">
            <summary className="flex cursor-pointer list-none items-center gap-3 p-3 marker:content-none">
              <span className="shrink-0 text-xs font-medium uppercase tracking-wide text-admin-fg-muted">
                После таблицы
              </span>
              <span className="min-w-0 flex-1 truncate text-sm text-admin-fg-muted">
                {[settings[cms.afterTitle]?.trim(), plainCmsText(settings[cms.afterHtml] ?? "")]
                  .filter(Boolean)
                  .join(" — ") || "Пусто — нажмите, чтобы развернуть"}
              </span>
              <span className="shrink-0 text-xs font-medium text-admin-fg-muted group-open:hidden">+ Развернуть</span>
              <span className="hidden shrink-0 text-xs font-medium text-admin-fg-muted group-open:inline">
                Свернуть
              </span>
            </summary>
            <div className="border-t border-admin-border p-3">
              <SectionFieldsForm
                hideSubmit
                settings={settings}
                fields={[
                  {
                    key: cms.afterTitle,
                    label: "Заголовок под таблицей",
                    placeholder: "Необязательно",
                    hint: "Пусто — заголовок не показывается.",
                  },
                  {
                    key: cms.afterHtml,
                    label: "Текст под таблицей",
                    type: "richtext",
                    hint: "Не заполнен — блок не показывается на сайте.",
                  },
                ]}
              />
            </div>
          </details>
        ) : null}

        {!register ? (
          <Button
            type="submit"
            form={`transfer-schedule-${transferId}-${direction}`}
            size="sm"
            disabled={pending}
          >
            {pending ? "Сохранение…" : "Сохранить расписание"}
          </Button>
        ) : null}
        {state && "error" in state ? <p className="text-sm text-red-600">{state.error}</p> : null}
        {state && "success" in state ? <p className="text-xs text-green-700">Сохранено</p> : null}
      </CardBody>
    </Card>
  )
}
