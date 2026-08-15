"use client"

import { useRef, useState } from "react"
import {
  BedDouble,
  Calendar,
  ChevronDown,
  Flag,
  Gift,
  Star,
  Sun,
  Snowflake,
  Heart,
  Sparkles,
  type LucideIcon,
} from "lucide-react"
import type { DatesTable as DatesTableData, DatesTableRoom, DatesTableRow } from "@/lib/types"
import {
  DATES_COLLAPSED_ROWS,
  deriveDuration,
  finalPrice,
  formatDateRange,
  formatDatesFootnotes,
  hasDatesTable,
  upcomingRows,
} from "@/lib/dates-table"
import { formatMoney } from "@/lib/currencies"
import { scrollBehavior } from "@/lib/scroll-to-id"
import { Alert } from "./alert"
import { ModalTourOrder } from "@/components/site/modals"

function DatesFootnotes({
  lines,
  placement,
  className,
}: {
  lines: string[]
  placement: "card" | "desktop"
  className?: string
}) {
  if (!lines.length) return null
  return (
    <p
      data-dates-footnotes={placement}
      className={className}
    >
      {lines.map((line, index) => (
        <span key={`${index}-${line.slice(0, 24)}`}>
          {index > 0 ? <br /> : null}
          {line}
        </span>
      ))}
    </p>
  )
}

const TAG_ICON_MAP: Record<string, LucideIcon> = {
  flag: Flag,
  gift: Gift,
  star: Star,
  calendar: Calendar,
  sun: Sun,
  snowflake: Snowflake,
  heart: Heart,
  sparkles: Sparkles,
}

function RadioDot({ selected }: { selected: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <circle cx="9" cy="9" r="8" strokeWidth="2" className={selected ? "stroke-brand" : "stroke-ink-muted"} />
      {selected ? <circle cx="9" cy="9" r="5" className="fill-brand" /> : null}
    </svg>
  )
}

function RowExtraPrice({ row }: { row: DatesTableRow }) {
  const extra = Number(row.extraPriceAmount || 0)
  const code = String(row.extraPriceCurrency || "").trim().toUpperCase()
  if (!(extra > 0) || !code) return null
  return (
    <span className="block text-[11px] font-medium text-ink-muted">
      + {formatMoney(extra, code)}
    </span>
  )
}

function PriceCard({
  room,
  row,
  currency,
  selected,
  onSelect,
}: {
  room: DatesTableRoom
  row: DatesTableRow
  currency: string
  selected: boolean
  onSelect: () => void
}) {
  const price = finalPrice(room)
  const discounted = room.discount > 0 && price < room.price
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`flex w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 px-3 py-3 text-center transition-colors ${
        selected ? "border-brand bg-cream" : "border-line/60 hover:border-brand/60"
      }`}
    >
      {discounted ? <span className="text-xs text-ink-muted line-through">{room.price} {currency}</span> : null}
      <span className="text-sm font-semibold leading-none">
        {price} {currency}
      </span>
      <RowExtraPrice row={row} />
      {discounted ? (
        <span className="rounded bg-[#FFC74A] px-1.5 py-0.5 text-xs font-semibold text-[#222]">
          -{room.discount}%
        </span>
      ) : null}
      <RadioDot selected={selected} />
    </button>
  )
}

function nearestDate(rows: DatesTableRow[]): string {
  return upcomingRows(rows)[0]?.startDate ?? ""
}

function Tags({ row, className = "flex flex-wrap gap-x-3 gap-y-1" }: { row: DatesTableRow; className?: string }) {
  return row.tags.length ? (
    <div className={className}>
      {row.tags.map((tag, ti) => {
        const Icon = TAG_ICON_MAP[tag.icon] ?? Flag
        return (
          <span key={ti} className="inline-flex items-center gap-1 text-xs font-medium text-cyan-accent">
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            {tag.label}
          </span>
        )
      })}
    </div>
  ) : null
}

function DatesCard({
  row,
  rowIndex,
  currency,
  footnotes,
  selectedRoom,
  onSelectRoom,
  onBook,
  detailsRef,
  open,
  onToggle,
}: {
  row: DatesTableRow
  rowIndex: number
  currency: string
  footnotes: string[]
  selectedRoom: string | undefined
  onSelectRoom: (name: string) => void
  onBook: () => void
  detailsRef: (node: HTMLDetailsElement | null) => void
  open: boolean
  onToggle: (open: boolean) => void
}) {
  const minPrice = row.rooms.length
    ? Math.min(...row.rooms.map(finalPrice))
    : 0
  return (
    <details
      ref={detailsRef}
      open={open}
      onToggle={(event) => onToggle(event.currentTarget.open)}
      className="group rounded-lg border border-line bg-white"
    >
      <summary className="flex cursor-pointer list-none items-start gap-3 px-4 py-4 [&::-webkit-details-marker]:hidden">
        <span className="hidden h-10 w-10 shrink-0 place-items-center rounded border border-brand bg-brand/20 text-brand-foreground md:grid">
          <Calendar className="h-5 w-5" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-start justify-between gap-2 md:block">
            <span>
              <span className="block text-base font-semibold text-ink">{formatDateRange(row.startDate, row.endDate)}</span>
              {deriveDuration(row.startDate, row.endDate) ? <span className="mt-0.5 block text-sm text-ink-muted">{deriveDuration(row.startDate, row.endDate)}</span> : null}
            </span>
            <span className="flex shrink-0 items-center gap-2 text-right md:hidden">
              <span className="text-sm text-ink-muted">
                от <strong className="block text-base text-ink">{minPrice} {currency}</strong>
                <RowExtraPrice row={row} />
              </span>
              <ChevronDown className="h-5 w-5 text-ink-muted transition-transform group-open:rotate-180" aria-hidden />
            </span>
          </span>
          <span className="mt-2 block"><Tags row={row} /></span>
        </span>
        <span className="hidden shrink-0 items-center gap-2 text-right md:flex">
          <span className="text-sm text-ink-muted">
            от <strong className="block text-base text-ink">{minPrice} {currency}</strong>
            <RowExtraPrice row={row} />
          </span>
          <ChevronDown className="h-5 w-5 text-ink-muted transition-transform group-open:rotate-180" aria-hidden />
        </span>
      </summary>
      <div className="mx-4 border-t border-line py-4">
        {row.description ? <p className="text-sm leading-relaxed text-ink">{row.description}</p> : null}
        <h3 className="mt-4 text-sm font-semibold text-ink">Выберите номер</h3>
        <div className="mt-3 space-y-2">
          {row.rooms.map((room) => {
            const price = finalPrice(room)
            const discounted = room.discount > 0 && price < room.price
            const selected = (selectedRoom ?? row.rooms[0]?.name) === room.name
            return (
              <label
                key={room.name}
                className={`flex cursor-pointer items-center gap-3 rounded border px-3 py-3 transition-colors ${
                  selected ? "border-brand bg-cream" : "border-line hover:border-brand/60"
                }`}
              >
                <BedDouble className="hidden h-5 w-5 shrink-0 text-ink-muted md:block" aria-hidden />
                <span className="min-w-0 flex-1 text-sm font-medium text-ink">{room.name}</span>
                <span className="flex shrink-0 flex-col items-end gap-0.5 text-right md:flex-row md:items-center md:gap-2">
                  <span className="flex items-center gap-2">
                    {discounted ? <span className="text-xs text-ink-muted line-through">{room.price} {currency}</span> : null}
                    {discounted ? (
                      <span className="rounded bg-[#FFC74A] px-1.5 py-0.5 text-xs font-semibold text-[#222]">
                        -{room.discount}%
                      </span>
                    ) : null}
                  </span>
                  <span>
                    <span className="text-sm font-semibold text-ink">{price} {currency}</span>
                    <RowExtraPrice row={row} />
                  </span>
                </span>
                <input
                  type="radio"
                  name={`dates-room-${rowIndex}`}
                  checked={selected}
                  onChange={() => onSelectRoom(room.name)}
                  className="sr-only"
                />
                <RadioDot selected={selected} />
              </label>
            )
          })}
        </div>
        <DatesFootnotes
          lines={footnotes}
          placement="card"
          className="mt-3 text-xs leading-relaxed text-ink-muted"
        />
        <button
          type="button"
          onClick={onBook}
          className="mt-4 w-full rounded bg-brand px-4 py-3 text-sm font-semibold text-brand-foreground transition-opacity hover:opacity-90"
        >
          Забронировать
        </button>
      </div>
    </details>
  )
}

export function DatesTable({ data, tourTitle = "" }: { data: DatesTableData; tourTitle?: string }) {
  const rows = upcomingRows(data.rows)
  const [expanded, setExpanded] = useState(false)
  const [selected, setSelected] = useState<Record<number, string>>({})
  const [selectedDate, setSelectedDate] = useState(() => nearestDate(rows))
  const [activeDate, setActiveDate] = useState<string | null>(null)
  const [openCards, setOpenCards] = useState<Record<number, boolean>>({})
  const [orderOpen, setOrderOpen] = useState(false)
  const [orderDate, setOrderDate] = useState("")
  const cardRefs = useRef<Record<number, HTMLDetailsElement | null>>({})

  function book(row?: DatesTableRow) {
    setOrderDate(row ? formatDateRange(row.startDate, row.endDate) : "")
    setOrderOpen(true)
  }

  /** One-shot scroll on find — never from render-driven effect (rows is a new array each render → scroll magnet). */
  function onFindDate() {
    const date = selectedDate
    setActiveDate(date)
    const index = rows.findIndex((row) => row.startDate === date)
    if (index < 0) return
    setOpenCards((cards) => ({ ...cards, [index]: true }))
    requestAnimationFrame(() => {
      cardRefs.current[index]?.scrollIntoView({ behavior: scrollBehavior(), block: "start" })
    })
  }

  if (!hasDatesTable({ ...data, rows })) return null

  const footnoteLines = formatDatesFootnotes(data)
  const allRoomNames = Array.from(new Set(rows.flatMap((row) => row.rooms.map((r) => r.name))))
  const collapsible = rows.length > DATES_COLLAPSED_ROWS
  const visibleRows = collapsible && !expanded ? rows.slice(0, DATES_COLLAPSED_ROWS) : rows
  const mobileRows = activeDate ? rows.filter((row) => row.startDate === activeDate) : visibleRows

  return (
    <div className="space-y-4">
      {data.note.trim() ? <Alert text={data.note} type={data.noteType} /> : null}

      {rows.length ? (
        <>
          <div className="relative hidden overflow-hidden rounded-xl border border-brand lg:block">
            <div className="overflow-x-auto">
              <table className="public-desktop-table w-full border-collapse text-left">
                <thead>
                  <tr className="bg-brand text-brand-foreground">
                    <th className="border-b border-line px-4 py-4 text-sm font-semibold sm:text-base">Даты тура</th>
                    <th className="border-b border-line px-4 py-4 text-sm font-semibold sm:text-base">Описание тура</th>
                    {allRoomNames.map((name) => (
                      <th key={name} className="w-[160px] border-b border-line px-4 py-4 text-center text-sm font-semibold sm:text-base">
                        {name}
                      </th>
                    ))}
                    <th className="border-b border-line px-4 py-4 text-center text-sm font-semibold sm:text-base">Бронь</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((row, ri) => {
                    const roomByName = new Map(row.rooms.map((r) => [r.name, r]))
                    const selectedName = selected[ri] ?? row.rooms[0]?.name
                    return (
                      <tr key={ri} className={ri % 2 ? "bg-cream" : "bg-white"}>
                        <td className="border-b border-line px-4 py-5 align-top text-sm">
                          <span className="font-semibold">{formatDateRange(row.startDate, row.endDate)}</span>
                          {deriveDuration(row.startDate, row.endDate) ? <span className="mt-1 block text-ink-muted">{deriveDuration(row.startDate, row.endDate)}</span> : null}
                        </td>
                        <td className="max-w-[260px] border-b border-line px-4 py-5 align-top text-sm leading-relaxed">
                          <Tags row={row} className="mb-2 flex flex-wrap gap-2" />
                          {row.description ? <p className="text-ink">{row.description}</p> : null}
                        </td>
                        {allRoomNames.map((name) => {
                          const room = roomByName.get(name)
                          if (!room) {
                            return (
                              <td key={name} className="w-[160px] border-b border-line px-4 py-5 opacity-30">
                                <div className="flex h-full flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-line/40 px-3 py-3">
                                  <span className="text-sm font-semibold text-ink-muted">—</span>
                                </div>
                              </td>
                            )
                          }
                          return (
                            <td key={name} className="w-[160px] border-b border-line px-4 py-5">
                              <PriceCard
                                room={room}
                                row={row}
                                currency={data.currency}
                                selected={name === selectedName}
                                onSelect={() => setSelected((s) => ({ ...s, [ri]: name }))}
                              />
                            </td>
                          )
                        })}
                        <td className="border-b border-line px-4 py-5 text-center align-middle">
                          <button type="button" onClick={() => book(row)} className="rounded bg-brand px-4 py-2.5 text-sm font-semibold text-brand-foreground transition-opacity hover:opacity-90">
                            Забронировать
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {collapsible ? (
              <>
                {!expanded ? <div className="pointer-events-none absolute bottom-[52px] left-0 h-40 w-full bg-gradient-to-b from-transparent via-white/70 to-white" /> : null}
                <div className={`relative bg-white p-4 text-center ${expanded ? "border-t border-line" : ""}`}>
                  <button type="button" onClick={() => setExpanded((v) => !v)} className="inline-flex items-center gap-2 rounded border border-cyan-accent bg-white px-6 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-cream">
                    {expanded ? "Скрыть даты" : "Показать все доступные даты"}
                    <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
                  </button>
                </div>
              </>
            ) : null}
          </div>

          <div className="space-y-4 lg:hidden">
            <div className="rounded-lg bg-cyan-accent p-4 text-white">
              <label htmlFor="dates-table-search" className="block text-sm font-semibold">
                Выберите удобные даты выезда:
              </label>
              <div className="mt-3 flex flex-col gap-2 min-[480px]:flex-row">
                <select
                  id="dates-table-search"
                  value={selectedDate}
                  onChange={(event) => setSelectedDate(event.target.value)}
                  className="min-w-0 flex-1 rounded border-0 bg-white px-3 py-3 text-sm text-ink outline-none"
                >
                  {rows.map((row) => <option key={`${row.startDate}-${row.endDate}`} value={row.startDate}>{formatDateRange(row.startDate, row.endDate)}</option>)}
                </select>
                <button
                  type="button"
                  onClick={onFindDate}
                  className="rounded bg-white px-5 py-3 text-sm font-bold text-ink transition-colors hover:bg-cream"
                >
                  НАЙТИ
                </button>
              </div>
              <p className="mt-2 text-xs text-white/90">Доступных дат: {rows.length}</p>
            </div>

            <div className="space-y-3">
              {mobileRows.map((row) => {
                const rowIndex = rows.indexOf(row)
                return (
                  <DatesCard
                    key={`${row.startDate}-${row.endDate}-${rowIndex}`}
                    row={row}
                    rowIndex={rowIndex}
                    currency={data.currency}
                    footnotes={footnoteLines}
                    selectedRoom={selected[rowIndex]}
                    onSelectRoom={(name) => setSelected((s) => ({ ...s, [rowIndex]: name }))}
                    onBook={() => book(row)}
                    detailsRef={(node) => { cardRefs.current[rowIndex] = node }}
                    open={!!openCards[rowIndex]}
                    onToggle={(open) => setOpenCards((cards) => ({ ...cards, [rowIndex]: open }))}
                  />
                )
              })}
            </div>

            {collapsible ? (
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    if (!expanded) {
                      setExpanded(true)
                      setActiveDate(null)
                    } else {
                      setExpanded(false)
                    }
                  }}
                  className="inline-flex w-full items-center justify-center gap-2 rounded border border-brand bg-white px-6 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-cream md:w-auto md:border-cyan-accent"
                >
                  {expanded ? "Скрыть даты" : "Показать все доступные даты"}
                  <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
                </button>
              </div>
            ) : null}
          </div>
        </>
      ) : null}

      <DatesFootnotes
        lines={footnoteLines}
        placement="desktop"
        className="hidden text-sm leading-relaxed text-ink lg:block"
      />

      <ModalTourOrder
        open={orderOpen}
        onClose={() => setOrderOpen(false)}
        tourTitle={tourTitle}
        tourDate={orderDate}
      />
    </div>
  )
}
