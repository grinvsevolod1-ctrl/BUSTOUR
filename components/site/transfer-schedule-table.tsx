"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import type { TransferSchedule } from "@/lib/types"
import { ModalTourOrder } from "@/components/site/modals"
import {
  publicColStyle,
  resolveTransferScheduleColWidths,
  type PublicColWidth,
  type PublicColWidthsMap,
  type TransferScheduleColId,
} from "@/lib/public-table-col-widths"

export const COLLAPSED_ROWS = 3

function TransferMobileCard({
  row,
  routeTitle,
  onBook,
}: {
  row: TransferSchedule
  routeTitle: string
  onBook: () => void
}) {
  return (
    <article className="overflow-hidden rounded-xl border border-line bg-cream/40 shadow-sm">
      <div className="rounded-t-xl border-b border-line/60 bg-cream p-4">
        <h3 className="text-base font-bold text-balance text-ink">{routeTitle}</h3>
      </div>
      <div className="grid grid-cols-2 gap-3 border-b border-line/60 bg-white p-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Отправление</p>
          <p className="mt-1 text-lg font-bold tabular-nums text-ink">{row.departureTime || "—"}</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Прибытие</p>
          <p className="mt-1 text-lg font-bold tabular-nums text-ink">{row.arrival || "—"}</p>
        </div>
      </div>
      {row.note?.trim() ? (
        <p className="border-b border-line/60 bg-white px-4 py-3 text-sm leading-relaxed text-ink-muted">{row.note}</p>
      ) : null}
      <div className="bg-white p-4">
        <button
          type="button"
          onClick={onBook}
          className="inline-flex w-full min-h-11 items-center justify-center rounded bg-brand px-4 py-2.5 text-sm font-semibold text-brand-foreground transition-opacity hover:opacity-90"
        >
          Забронировать
        </button>
      </div>
    </article>
  )
}

function ShowMoreButton({ expanded, onToggle }: { expanded: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="inline-flex items-center gap-2 rounded border border-cyan-accent bg-white px-6 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-cream"
    >
      {expanded ? "Скрыть даты" : "Показать все доступные даты"}
      <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
    </button>
  )
}

function cellClassFor(mode: PublicColWidth["mode"], base: string, extras = "") {
  // hug times stay on one line; fill/fixed may wrap note text via separate classes
  const hug = mode === "hug" ? "whitespace-nowrap" : ""
  return [base, hug, extras].filter(Boolean).join(" ")
}

export function TransferScheduleTable({
  rows,
  title,
  bookingTitle,
  colWidths: colWidthsRaw,
}: {
  rows: TransferSchedule[]
  /** When omitted, parent renders the heading (e.g. with CMS richtext around the table). */
  title?: string
  /** Prefills modal product field (transfer route name). */
  bookingTitle: string
  /** CMS JSON for public column widths (hug / fill / fixed). */
  colWidths?: string | PublicColWidthsMap | null
}) {
  const [expanded, setExpanded] = useState(false)
  const [orderOpen, setOrderOpen] = useState(false)
  const [orderDate, setOrderDate] = useState("")

  if (!rows.length) return null
  const collapsible = rows.length > COLLAPSED_ROWS
  const visibleRows = collapsible && !expanded ? rows.slice(0, COLLAPSED_ROWS) : rows
  const widths =
    typeof colWidthsRaw === "string" || colWidthsRaw == null
      ? resolveTransferScheduleColWidths(colWidthsRaw)
      : resolveTransferScheduleColWidths(JSON.stringify(colWidthsRaw))

  function openBooking(departureTime: string) {
    setOrderDate(departureTime.trim())
    setOrderOpen(true)
  }

  const cell = "border border-line px-3 py-3 align-top text-sm text-ink sm:px-4 sm:py-4"
  const headCell =
    "border border-line/80 bg-brand px-3 py-3 text-left text-sm font-semibold text-brand-foreground sm:px-4 sm:text-base"

  const cols: TransferScheduleColId[] = ["departure", "arrival", "note", "booking"]
  const styles = {
    departure: publicColStyle(widths.departure),
    arrival: publicColStyle(widths.arrival),
    note: publicColStyle(widths.note),
    booking: publicColStyle(widths.booking),
  }

  return (
    <section className="min-w-0 space-y-4">
      {title ? <h2 className="text-xl font-semibold text-ink">{title}</h2> : null}

      {/* Desktop table — lg+ ; auto layout so hug includes cell/button padding */}
      <div className="relative hidden min-w-0 lg:block">
        <div className="overflow-x-auto rounded-xl border border-brand">
          <table className="public-desktop-table w-full border-collapse text-left">
            <colgroup>
              {cols.map((id) => (
                <col key={id} style={styles[id]} data-col-mode={widths[id].mode} data-col-id={id} />
              ))}
            </colgroup>
            <thead>
              <tr>
                <th
                  className={cellClassFor(widths.departure.mode, headCell)}
                  style={styles.departure}
                  data-col-mode={widths.departure.mode}
                  data-col-id="departure"
                >
                  Отправление
                </th>
                <th
                  className={cellClassFor(widths.arrival.mode, headCell)}
                  style={styles.arrival}
                  data-col-mode={widths.arrival.mode}
                  data-col-id="arrival"
                >
                  Прибытие
                </th>
                <th
                  className={headCell}
                  style={styles.note}
                  data-col-mode={widths.note.mode}
                  data-col-id="note"
                >
                  Примечание
                </th>
                <th
                  className={cellClassFor(widths.booking.mode, headCell, "text-center")}
                  style={styles.booking}
                  data-col-mode={widths.booking.mode}
                  data-col-id="booking"
                >
                  Бронь
                </th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row, index) => (
                <tr
                  key={row.id ?? `${row.departureTime}-${row.arrival}-${index}`}
                  className={index % 2 ? "bg-cream" : "bg-white"}
                >
                  <td
                    className={cellClassFor(widths.departure.mode, cell, "whitespace-nowrap font-semibold tabular-nums")}
                    style={styles.departure}
                  >
                    {row.departureTime || "—"}
                  </td>
                  <td
                    className={cellClassFor(widths.arrival.mode, cell, "whitespace-nowrap tabular-nums")}
                    style={styles.arrival}
                  >
                    {row.arrival || "—"}
                  </td>
                  <td
                    className={`${cell} break-words leading-relaxed text-ink-muted`}
                    style={styles.note}
                  >
                    {row.note || "—"}
                  </td>
                  <td
                    className={cellClassFor(widths.booking.mode, cell, "text-center")}
                    style={styles.booking}
                  >
                    <button
                      type="button"
                      onClick={() => openBooking(row.departureTime)}
                      className="inline-flex whitespace-nowrap rounded bg-brand px-4 py-2.5 text-sm font-semibold text-brand-foreground transition-opacity hover:opacity-90"
                    >
                      Забронировать
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {collapsible ? (
          <>
            {!expanded ? (
              <div className="pointer-events-none absolute bottom-[52px] left-0 h-32 w-full bg-gradient-to-b from-transparent via-white/70 to-white" />
            ) : null}
            <div className={`relative bg-white p-4 text-center ${expanded ? "border-t border-line" : ""}`}>
              <ShowMoreButton expanded={expanded} onToggle={() => setExpanded((value) => !value)} />
            </div>
          </>
        ) : null}
      </div>

      {/* Mobile / tablet cards — prices live in page price block above */}
      <div className="space-y-3 lg:hidden">
        {visibleRows.map((row, index) => (
          <TransferMobileCard
            key={row.id ?? `${row.departureTime}-${row.arrival}-${index}`}
            row={row}
            routeTitle={title || bookingTitle}
            onBook={() => openBooking(row.departureTime)}
          />
        ))}
        {collapsible ? (
          <div className="text-center">
            <ShowMoreButton expanded={expanded} onToggle={() => setExpanded((value) => !value)} />
          </div>
        ) : null}
      </div>

      <ModalTourOrder
        open={orderOpen}
        onClose={() => setOrderOpen(false)}
        tourTitle={bookingTitle}
        tourDate={orderDate}
        title="Заказать трансфер"
        productLabel="Маршрут:"
        dateLabel="Время отправления:"
        requireEmail={false}
      />
    </section>
  )
}
