"use client"

import Link from "next/link"
import { AlertTriangle, ArrowUpDown, CalendarDays, ExternalLink, Search } from "lucide-react"
import { useMemo, useState } from "react"
import type { Tour } from "@/lib/types"
import { finalPrice, formatDateRange, upcomingRows, isDateRangeOrdered } from "@/lib/dates-table"
import { Card, CardBody, CardHeader, CardTitle, EmptyState, Input, PageHeader, Select, TableWrap, Tbody, Td, Th, Thead, Tr } from "@/components/admin/ui"

type SortKey = "date" | "basePrice" | "finalPrice" | "tour"
type GridRow = {
  id: string
  tour: Tour
  date?: Tour["datesTable"]["rows"][number]
  room?: Tour["datesTable"]["rows"][number]["rooms"][number]
  issue?: string
}

function isoStart(row?: Tour["datesTable"]["rows"][number]) {
  return row?.startDate && /^\d{4}-\d{2}-\d{2}$/.test(row.startDate) ? row.startDate : ""
}

function formatMoney(value: number, currency: string) {
  return `${Math.round(value).toLocaleString("ru-RU")} ${currency}`
}

function dateFromToday(value: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const date = new Date(`${value}T00:00:00`)
  return !Number.isNaN(date.getTime()) && date >= today
}

export function TourPricingWorkspace({ tours, cityNameById }: { tours: Tour[]; cityNameById: Record<number, string> }) {
  const [query, setQuery] = useState("")
  const [gridQuery, setGridQuery] = useState("")
  const [priceMin, setPriceMin] = useState("")
  const [priceMax, setPriceMax] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [sort, setSort] = useState<{ key: SortKey; direction: "asc" | "desc" }>({ key: "date", direction: "asc" })
  const cityName = (tour: Tour) => cityNameById[tour.arrivalCityId] || tour.citySlug || "—"

  const filteredTours = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return tours
    return tours.filter((tour) => [tour.title, tour.country, cityName(tour)].some((value) => value.toLowerCase().includes(needle)))
  }, [query, tours])

  const gridRows = useMemo<GridRow[]>(() => {
    const rows: GridRow[] = []
    for (const tour of tours) {
      if (!tour.datesTable.rows.length) {
        rows.push({ id: `${tour.id}-empty`, tour, issue: "Нет дат" })
        continue
      }
      for (const [dateIndex, date] of tour.datesTable.rows.entries()) {
        const inverted =
          date.startDate &&
          date.endDate &&
          !isDateRangeOrdered(date.startDate, date.endDate)
        if (!date.rooms.length) {
          rows.push({
            id: `${tour.id}-${date.id ?? dateIndex}-empty`,
            tour,
            date,
            issue: inverted ? "Прибытие < отправления" : "Нет номеров",
          })
          continue
        }
        for (const [roomIndex, room] of date.rooms.entries()) {
          rows.push({
            id: `${tour.id}-${date.id ?? dateIndex}-${room.id ?? roomIndex}`,
            tour,
            date,
            room,
            issue: inverted
              ? "Прибытие < отправления"
              : !isoStart(date)
                ? "Нет даты"
                : room.price <= 0
                  ? "Цена 0"
                  : undefined,
          })
        }
      }
    }
    return rows
  }, [tours])

  const filteredGrid = useMemo(() => {
    const needle = gridQuery.trim().toLowerCase()
    const min = priceMin === "" ? null : Number(priceMin)
    const max = priceMax === "" ? null : Number(priceMax)
    const result = gridRows.filter((row) => {
      const room = row.room
      const final = room ? finalPrice(room) : 0
      const textMatch = !needle || [row.tour.title, row.tour.country, cityName(row.tour), room?.name ?? ""].some((value) => value.toLowerCase().includes(needle))
      const date = isoStart(row.date)
      return textMatch && (min === null || final >= min) && (max === null || final <= max) && (!dateFrom || (date && date >= dateFrom)) && (!dateTo || (date && date <= dateTo))
    })
    return result.sort((a, b) => {
      let left: string | number = ""
      let right: string | number = ""
      if (sort.key === "date") { left = isoStart(a.date); right = isoStart(b.date) }
      if (sort.key === "basePrice") { left = a.room?.price ?? 0; right = b.room?.price ?? 0 }
      if (sort.key === "finalPrice") { left = a.room ? finalPrice(a.room) : 0; right = b.room ? finalPrice(b.room) : 0 }
      if (sort.key === "tour") { left = a.tour.title; right = b.tour.title }
      const comparison = left < right ? -1 : left > right ? 1 : 0
      return sort.direction === "asc" ? comparison : -comparison
    })
  }, [dateFrom, dateTo, gridQuery, gridRows, priceMax, priceMin, sort])

  function toggleSort(key: SortKey) {
    setSort((current) => current.key === key ? { key, direction: current.direction === "asc" ? "desc" : "asc" } : { key, direction: "asc" })
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Даты и цены" description="Рабочее пространство для управления выездами и контроля цен автобусных туров." />

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Автобусные туры</CardTitle>
            <p className="mt-1 text-xs text-admin-fg-muted">Найдено: {filteredTours.length} из {tours.length}</p>
          </div>
          <div className="relative w-full sm:w-80">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-admin-fg-subtle" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Поиск по туру, стране или городу" className="pl-9" />
          </div>
        </CardHeader>
        {filteredTours.length ? (
          <TableWrap className="min-w-[760px]">
            <Thead>
              <Tr>
                <Th>Тур</Th>
                <Th>Страна / город</Th>
                <Th>Выездов</Th>
                <Th>Цены</Th>
                <Th>Ближайший выезд</Th>
                <Th actions className="sr-only">
                  Действия
                </Th>
              </Tr>
            </Thead>
            <Tbody>
              {filteredTours.map((tour) => {
                const upcoming = upcomingRows(tour.datesTable.rows)
                const pastCount = tour.datesTable.rows.length - upcoming.length
                const rooms = upcoming.flatMap((row) => row.rooms)
                const prices = rooms.map(finalPrice)
                const starts = upcoming.map((row) => row.startDate).filter(Boolean).sort()
                return (
                  <Tr key={tour.id} className="align-top">
                    <Td className="font-medium">{tour.title}</Td>
                    <Td className="text-admin-fg-muted">
                      {tour.country || "—"}
                      <br />
                      {cityName(tour)}
                    </Td>
                    <Td>
                      {upcoming.length}
                      {pastCount > 0 ? (
                        <span
                          className="mt-1 block text-xs font-medium text-amber-700"
                          title="Прошедшие даты скрыты на сайте"
                        >
                          {pastCount} неакт.
                        </span>
                      ) : null}
                    </Td>
                    <Td>
                      {prices.length
                        ? `${formatMoney(Math.min(...prices), tour.datesTable.currency)} – ${formatMoney(Math.max(...prices), tour.datesTable.currency)}`
                        : "—"}
                    </Td>
                    <Td>
                      {starts[0] ? new Date(`${starts[0]}T00:00:00`).toLocaleDateString("ru-RU") : "—"}
                    </Td>
                    <Td actions>
                      <Link
                        href={`/admin/tour-pricing/${tour.id}`}
                        className="inline-flex rounded-md bg-admin-fg px-3 py-2 text-xs font-medium text-white hover:bg-admin-fg/90"
                      >
                        Редактировать
                      </Link>
                    </Td>
                  </Tr>
                )
              })}
            </Tbody>
          </TableWrap>
        ) : <CardBody><EmptyState title="Туры не найдены" /></CardBody>}
      </Card>

      {/* <Card>
        <CardHeader><div className="flex items-center gap-2"><CalendarDays className="h-4 w-4" /><CardTitle>Сводная сетка цен</CardTitle></div><p className="mt-1 text-xs text-admin-fg-muted">Показано строк: {filteredGrid.length} из {gridRows.length}</p></CardHeader>
        <CardBody className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Input value={gridQuery} onChange={(event) => setGridQuery(event.target.value)} placeholder="Поиск по туру, городу, номеру" />
            <Input type="number" min={0} value={priceMin} onChange={(event) => setPriceMin(event.target.value)} placeholder="Итог от" />
            <Input type="number" min={0} value={priceMax} onChange={(event) => setPriceMax(event.target.value)} placeholder="Итог до" />
            <Input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} aria-label="Дата от" />
            <Input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} aria-label="Дата до" />
          </div>
          <TableWrap className="min-w-[980px]"><Thead><tr><Th><SortButton label="Тур" active={sort.key === "tour"} direction={sort.direction} onClick={() => toggleSort("tour")} /></Th><Th>Город</Th><Th><SortButton label="Дата" active={sort.key === "date"} direction={sort.direction} onClick={() => toggleSort("date")} /></Th><Th>Номер</Th><Th><SortButton label="Базовая цена" active={sort.key === "basePrice"} direction={sort.direction} onClick={() => toggleSort("basePrice")} /></Th><Th>Скидка %</Th><Th><SortButton label="Итог" active={sort.key === "finalPrice"} direction={sort.direction} onClick={() => toggleSort("finalPrice")} /></Th></tr></Thead><Tbody>{filteredGrid.map((row) => { const warning = !!row.issue; return <Tr key={row.id} className={warning ? "bg-amber-50/70" : undefined}><Td><Link href={`/admin/tour-pricing/${row.tour.id}`} className="font-medium text-admin-fg hover:underline">{row.tour.title}</Link>{warning ? <span className="ml-2 inline-flex items-center gap-1 text-xs text-amber-700" title={row.issue}><AlertTriangle className="h-3.5 w-3.5" />{row.issue}</span> : null}</Td><Td>{cityName(row.tour)}</Td><Td>{row.date ? formatDateRange(row.date.startDate, row.date.endDate) || "—" : "—"}</Td><Td>{row.room?.name || "—"}</Td><Td>{row.room ? formatMoney(row.room.price, row.tour.datesTable.currency) : "—"}</Td><Td>{row.room ? `${row.room.discount}%` : "—"}</Td><Td className="font-semibold">{row.room ? formatMoney(finalPrice(row.room), row.tour.datesTable.currency) : "—"}</Td></Tr> })}</Tbody></TableWrap>
          {filteredGrid.length === 0 ? <p className="py-8 text-center text-sm text-admin-fg-muted">Нет строк по выбранным фильтрам.</p> : null}
        </CardBody>
      </Card> */}
    </div>
  )
}

function SortButton({ label, active, direction, onClick }: { label: string; active: boolean; direction: "asc" | "desc"; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="inline-flex items-center gap-1 font-medium hover:text-admin-fg">{label}<ArrowUpDown className={active ? "h-3.5 w-3.5 text-admin-fg" : "h-3.5 w-3.5 text-admin-fg-subtle"} aria-label={active ? `Сортировка ${direction === "asc" ? "по возрастанию" : "по убыванию"}` : "Сортировать"} /></button>
}
