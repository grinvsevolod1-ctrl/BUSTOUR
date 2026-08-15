"use client"

import Link from "next/link"
import { ArrowLeft, ExternalLink, Plus, Save, Trash2 } from "lucide-react"
import { useActionState, useEffect, useState, type FormEvent } from "react"
import type { Currency, DatesTable, DatesTableRow, DatesTableTag, DatesTableRoom, Tour } from "@/lib/types"
import { CurrencySelect } from "@/components/currency/currency-select"
import { deriveDuration, finalPrice, isUpcomingDeparture, datesTableRangeError, dateRangeOrderError, TAG_ICONS, coerceDatesTable } from "@/lib/dates-table"
import { ALERT_KIND_OPTIONS } from "@/lib/alert-kind"
import { saveTourDatesTableAction } from "@/app/admin/actions"
import { resolveTourLayout } from "@/lib/tour-sections"
import { Button, Card, CardBody, CardHeader, CardTitle, IconButton, Input, Label, Select, Textarea } from "@/components/admin/ui"
import { useActionToast } from "@/components/admin/use-action-toast"
import { useAdminDirtyForm } from "@/components/admin/use-admin-dirty-form"

function copyTable(table: DatesTable): DatesTable {
  return coerceDatesTable(JSON.parse(JSON.stringify(table)))
}

const emptyRow: DatesTableRow = { startDate: "", endDate: "", description: "", extraPriceAmount: 0, extraPriceCurrency: "", tags: [], rooms: [] }

export function TourPricingEditor({
  tour,
  cityName,
  currencies = [],
}: {
  tour: Tour
  cityName: string
  currencies?: Currency[]
}) {
  const datesLabel = resolveTourLayout(tour.layout).find((section) => section.key === "dates")?.label || "Даты и цены"
  const [table, setTable] = useState<DatesTable>(() => copyTable(tour.datesTable))
  const [clientError, setClientError] = useState<string | null>(null)
  const [state, action, pending] = useActionState(saveTourDatesTableAction, null)
  useActionToast(state, { successMessage: `${datesLabel} сохранены` })
  const { markDirty, markClean, formInputHandlers } = useAdminDirtyForm({
    id: `tour-pricing-${tour.id}`,
    label: `Цены на тур: ${tour.title || `#${tour.id}`}`,
  })
  useEffect(() => {
    if (state?.success) markClean()
  }, [state?.success, markClean])

  const rangeError = datesTableRangeError(table)
  const bannerError = clientError || state?.error || rangeError

  const patch = (next: Partial<DatesTable>) => {
    setClientError(null)
    setTable((current) => ({ ...current, ...next }))
    markDirty()
  }
  const updateRow = (index: number, next: Partial<DatesTableRow>) => {
    setClientError(null)
    setTable((current) => ({
      ...current,
      rows: current.rows.map((row, rowIndex) => (rowIndex === index ? { ...row, ...next } : row)),
    }))
    markDirty()
  }
  const removeRow = (index: number) => {
    if (table.rows[index]?.rooms.length && !window.confirm("В строке есть номера. Удалить выезд вместе с номерами?")) return
    patch({ rows: table.rows.filter((_, rowIndex) => rowIndex !== index) })
  }
  const addTag = (index: number) => updateRow(index, { tags: [...table.rows[index].tags, { icon: "flag", label: "" }] })
  const updateTag = (rowIndex: number, tagIndex: number, next: Partial<DatesTableTag>) => updateRow(rowIndex, { tags: table.rows[rowIndex].tags.map((tag, index) => index === tagIndex ? { ...tag, ...next } : tag) })
  const removeTag = (rowIndex: number, tagIndex: number) => updateRow(rowIndex, { tags: table.rows[rowIndex].tags.filter((_, index) => index !== tagIndex) })
  const addRoom = (index: number) => updateRow(index, { rooms: [...table.rows[index].rooms, { name: "", price: 0, discount: 0 }] })
  const updateRoom = (rowIndex: number, roomIndex: number, next: Partial<DatesTableRoom>) => updateRow(rowIndex, { rooms: table.rows[rowIndex].rooms.map((room, index) => index === roomIndex ? { ...room, ...next } : room) })
  const removeRoom = (rowIndex: number, roomIndex: number) => updateRow(rowIndex, { rooms: table.rows[rowIndex].rooms.filter((_, index) => index !== roomIndex) })
  const publicHref = tour.countrySlug && tour.citySlug ? `/avtobusnye-tury/${tour.countrySlug}/${tour.citySlug}/${tour.slug}` : `/avtobusnye-tury`

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    const err = datesTableRangeError(table)
    if (err) {
      event.preventDefault()
      setClientError(err)
      window.alert(err)
    }
  }

  return <div className="space-y-6">
    <div className="sticky top-0 z-20 -mx-4 border-b border-admin-border bg-admin-bg/95 px-4 py-3 backdrop-blur md:-mx-8 md:px-8 lg:-mx-10 lg:px-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><Link href="/admin/tour-pricing" className="mb-1 inline-flex items-center gap-1 text-xs text-admin-fg-muted hover:text-admin-fg"><ArrowLeft className="h-3.5 w-3.5" /> к списку</Link><h1 className="text-xl font-bold text-admin-fg">{tour.title}</h1><p className="text-sm text-admin-fg-muted">{tour.country || "—"} · {cityName}</p></div>
        <div className="flex items-center gap-2"><Link href={publicHref} target="_blank" className="inline-flex items-center gap-2 rounded-md border border-admin-border bg-white px-3 py-2 text-xs font-medium text-admin-fg hover:bg-admin-muted"><ExternalLink className="h-3.5 w-3.5" /> Открыть на сайте</Link><Button type="submit" form="tour-pricing-form" disabled={pending || !!rangeError}><Save className="h-4 w-4" />{pending ? "Сохранение…" : "Сохранить"}</Button></div>
      </div>
      {state?.success && !bannerError ? <p className="mt-2 text-sm text-emerald-700" role="status">{datesLabel} сохранены.</p> : null}
      {bannerError ? <p className="mt-2 text-sm text-admin-danger" role="alert">{bannerError}</p> : null}
    </div>

    <form id="tour-pricing-form" action={action} onSubmit={onSubmit} className="space-y-5" {...formInputHandlers()}>
      <input type="hidden" name="tourId" value={tour.id} />
      <input type="hidden" name="table" value={JSON.stringify(table)} />
      <Card>
        <CardHeader><CardTitle>{datesLabel}: настройки блока</CardTitle></CardHeader>
        <CardBody className="space-y-4">
          <div className="grid gap-4 md:grid-cols-[1fr_180px_160px]">
            <div>
              <Label htmlFor="dates-note">Примечание</Label>
              <Textarea
                id="dates-note"
                value={table.note}
                onChange={(event) => patch({ note: event.target.value })}
                rows={3}
                placeholder="Маршрут, срок актуальности цен..."
              />
            </div>
            <div>
              <Label htmlFor="dates-note-type">Тип примечания</Label>
              <Select
                id="dates-note-type"
                value={table.noteType}
                onChange={(event) => patch({ noteType: event.target.value as DatesTable["noteType"] })}
              >
                {ALERT_KIND_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="dates-currency">Валюта</Label>
              {currencies.length ? (
                <CurrencySelect
                  value={table.currency}
                  onChange={(code) => patch({ currency: code })}
                  options={currencies}
                  ariaLabel="Валюта таблицы дат"
                  className="w-full"
                />
              ) : (
                <Input
                  id="dates-currency"
                  value={table.currency}
                  onChange={(event) => patch({ currency: event.target.value })}
                  placeholder="BYN"
                />
              )}
            </div>
          </div>
          <div className="rounded-md border border-admin-border p-3" data-dates-footnotes-editor>
            <div className="mb-2 flex items-center justify-between gap-2">
              <div>
                <Label className="mb-0">Сноски</Label>
                <p className="text-xs text-admin-fg-subtle">
                  На сайте: в карточке (мобильный/планшет) и под таблицей (десктоп). Плейсхолдер {"{currency}"} → код валюты.
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => patch({ footnotes: [...table.footnotes, ""] })}
              >
                <Plus className="h-3.5 w-3.5" /> Добавить сноску
              </Button>
            </div>
            <div className="space-y-2">
              {table.footnotes.map((line, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    id={index === 0 ? "dates-footnote-0" : undefined}
                    value={line}
                    onChange={(event) =>
                      patch({
                        footnotes: table.footnotes.map((item, i) => (i === index ? event.target.value : item)),
                      })
                    }
                    placeholder="* Текст сноски…"
                  />
                  <IconButton
                    type="button"
                    tone="danger"
                    onClick={() => patch({ footnotes: table.footnotes.filter((_, i) => i !== index) })}
                    aria-label="Удалить сноску"
                  >
                    <Trash2 className="h-4 w-4" />
                  </IconButton>
                </div>
              ))}
              {!table.footnotes.length ? (
                <p className="text-xs text-admin-fg-subtle">Сносок нет — на сайте блок не покажется.</p>
              ) : null}
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-semibold text-admin-fg">Выезды</h2><p className="text-sm text-admin-fg-muted">Добавляйте реальные даты, номера и цены. Изменения применяются только после сохранения.</p></div><Button type="button" variant="secondary" size="sm" onClick={() => patch({ rows: [...table.rows, { ...emptyRow }] })}><Plus className="h-4 w-4" /> Выезд</Button></div>
      <div className="space-y-4">{table.rows.map((row, rowIndex) => {
        const outdated = !!row.startDate && !isUpcomingDeparture(row.startDate)
        const inverted = dateRangeOrderError(row.startDate, row.endDate, `Выезд ${rowIndex + 1}`)
        return <Card key={row.id ?? rowIndex} className={outdated || inverted ? "border-amber-300 ring-1 ring-amber-200" : undefined}><CardHeader className="flex items-center justify-between gap-3"><div className="flex min-w-0 flex-wrap items-center gap-2"><CardTitle>Выезд {rowIndex + 1}</CardTitle>{outdated ? <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800" title="Дата начала уже прошла — на сайте не показывается">Неактуально</span> : null}{inverted ? <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800">Даты перепутаны</span> : null}</div><IconButton type="button" tone="danger" onClick={() => removeRow(rowIndex)} aria-label="Удалить выезд"><Trash2 className="h-4 w-4" /></IconButton></CardHeader><CardBody className="space-y-4"><div className="grid gap-3 md:grid-cols-[1fr_1fr_180px]"><div><Label>Дата отправления</Label><Input type="date" value={row.startDate} onChange={(event) => updateRow(rowIndex, { startDate: event.target.value })} /></div><div><Label>Дата прибытия</Label><Input type="date" value={row.endDate} min={row.startDate || undefined} onChange={(event) => updateRow(rowIndex, { endDate: event.target.value })} /></div><div><Label>Длительность</Label><div className="rounded-md border border-admin-border bg-admin-muted px-3 py-2 text-sm text-admin-fg-muted">{deriveDuration(row.startDate, row.endDate) || "—"}</div></div></div>{inverted ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900" role="alert">{inverted}</p> : null}{outdated ? <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">Прошедшая дата: не попадает в фильтр «Период выезда» и не выводится в таблице на сайте.</p> : null}<div><Label>Описание</Label><Textarea value={row.description} onChange={(event) => updateRow(rowIndex, { description: event.target.value })} rows={2} /></div><div className="grid gap-3 md:grid-cols-[1fr_180px]"><div><Label>Доп. цена на выезд</Label><Input type="number" min={0} step="0.01" value={row.extraPriceAmount || ""} onChange={(event) => updateRow(rowIndex, { extraPriceAmount: Number(event.target.value) })} /></div><div><Label>Валюта доп. цены</Label><Input value={row.extraPriceCurrency} onChange={(event) => updateRow(rowIndex, { extraPriceCurrency: event.target.value.toUpperCase() })} placeholder="USD" /></div></div>
        <div className="rounded-md border border-admin-border p-3"><div className="mb-2 flex items-center justify-between"><Label className="mb-0">Теги</Label><Button type="button" variant="secondary" size="sm" onClick={() => addTag(rowIndex)}><Plus className="h-3.5 w-3.5" /> Тег</Button></div>{row.tags.map((tag, tagIndex) => <div key={tagIndex} className="mb-2 flex gap-2"><Select value={tag.icon} onChange={(event) => updateTag(rowIndex, tagIndex, { icon: event.target.value })} className="w-36">{TAG_ICONS.map((icon) => <option key={icon} value={icon}>{icon}</option>)}</Select><Input value={tag.label} onChange={(event) => updateTag(rowIndex, tagIndex, { label: event.target.value })} placeholder="Подпись тега" /><IconButton type="button" tone="danger" onClick={() => removeTag(rowIndex, tagIndex)} aria-label="Удалить тег"><Trash2 className="h-4 w-4" /></IconButton></div>)}{!row.tags.length ? <p className="text-xs text-admin-fg-subtle">Тегов нет.</p> : null}</div>
        <div className="rounded-md border border-admin-border p-3"><div className="mb-2 flex items-center justify-between"><Label className="mb-0">Номера</Label><Button type="button" variant="secondary" size="sm" onClick={() => addRoom(rowIndex)}><Plus className="h-3.5 w-3.5" /> Номер</Button></div><div className="space-y-2">{row.rooms.map((room, roomIndex) => <div key={room.id ?? roomIndex} className="grid gap-2 md:grid-cols-[1fr_130px_110px_130px_auto] md:items-center"><Input value={room.name} onChange={(event) => updateRoom(rowIndex, roomIndex, { name: event.target.value })} placeholder="Комфорт" /><Input type="number" min={0} step="0.01" value={room.price || ""} onChange={(event) => updateRoom(rowIndex, roomIndex, { price: Number(event.target.value) })} placeholder="Базовая цена" /><Input type="number" min={0} max={100} value={room.discount || ""} onChange={(event) => updateRoom(rowIndex, roomIndex, { discount: Number(event.target.value) })} placeholder="Скидка %" /><div className="text-sm text-admin-fg-muted">Итог: <strong className="text-admin-fg">{finalPrice(room)} {table.currency}</strong></div><IconButton type="button" tone="danger" onClick={() => removeRoom(rowIndex, roomIndex)} aria-label="Удалить номер"><Trash2 className="h-4 w-4" /></IconButton></div>)}{!row.rooms.length ? <p className="text-xs text-admin-fg-subtle">Номеров нет.</p> : null}</div></div>
      </CardBody></Card>
      })}</div>
      {!table.rows.length ? <Card><CardBody><p className="text-center text-sm text-admin-fg-muted">Выездов пока нет. Добавьте первую дату.</p></CardBody></Card> : null}
    </form>
  </div>
}
