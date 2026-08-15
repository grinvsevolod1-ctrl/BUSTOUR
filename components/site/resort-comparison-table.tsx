"use client"

import { useState, useSyncExternalStore } from "react"
import { ChevronDown } from "lucide-react"
import type { ContentBlock } from "@/lib/types"
import {
  publicColStyle,
  resolveTableColWidths,
  type PublicColWidthsMap,
} from "@/lib/public-table-col-widths"
import { TitleUnderline } from "@/components/site/title-underline"
import { sanitizeCmsHtml } from "@/lib/sanitize-html"

export const RESORT_COLLAPSED_ROWS = 3
export const RESORT_COLLAPSED_TABLES = 3

/** Tailwind `sm` — below this, cards are 1-col and may collapse. */
export const RESORT_CARD_COLLAPSE_MAX_PX = 639

/** True when viewport shows one card per row (phone). Tablet+ grid stays fully open. */
export function resortCardCollapseEnabled(viewportWidth: number): boolean {
  return viewportWidth <= RESORT_CARD_COLLAPSE_MAX_PX
}

const SINGLE_COL_MQ = `(max-width: ${RESORT_CARD_COLLAPSE_MAX_PX}px)`

function subscribeSingleCol(onChange: () => void) {
  const mq = window.matchMedia(SINGLE_COL_MQ)
  mq.addEventListener("change", onChange)
  return () => mq.removeEventListener("change", onChange)
}

function singleColSnapshot() {
  return window.matchMedia(SINGLE_COL_MQ).matches
}

/** Live: collapse chevron only in single-column card layout. SSR assumes phone. */
function useResortCardCollapsible() {
  return useSyncExternalStore(subscribeSingleCol, singleColSnapshot, () => true)
}

/** Preview slice for collapsed lists (rows or tables). */
export function visibleSlice<T>(items: T[], expanded: boolean, limit: number): T[] {
  if (expanded || items.length <= limit) return items
  return items.slice(0, limit)
}

function looksLikeHtml(s: string) {
  return /<\/?[a-z][\s\S]*>/i.test(s)
}

function stripHtml(s: string) {
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
}

function CellHtml({ value, className }: { value: string; className?: string }) {
  if (looksLikeHtml(value)) {
    return (
      <div
        className={className}
        dangerouslySetInnerHTML={{ __html: sanitizeCmsHtml(value) }}
      />
    )
  }
  return <span className={className}>{value}</span>
}

interface ResortTableData {
  title: string
  subtitle: string
  /** Rich HTML under the grid (block.body for new-format tables). */
  footer: string
  columns: string[]
  rows: string[][]
  colWidths: PublicColWidthsMap
}

function parseBlock(b: ContentBlock): ResortTableData {
  const ex = b.extra as Record<string, unknown>

  if (Array.isArray(ex?.columns)) {
    return {
      title: b.title,
      subtitle: b.subtitle,
      footer: b.body ?? "",
      columns: (ex.columns as unknown[]).map(String),
      rows: Array.isArray(ex.rows)
        ? (ex.rows as unknown[][]).map((r) => r.map(String))
        : [],
      colWidths: resolveTableColWidths(ex.colWidths, ex.columns.length),
    }
  }

  // Legacy: title=resort, subtitle=audience, body=pros, icon=cons
  return {
    title: "",
    subtitle: "",
        footer: "",
    columns: ["Курорт", "Кому подходит", "Сильные стороны", "Возможные нюансы"],
    rows: [[b.title, b.subtitle, b.body, b.icon]],
    colWidths: resolveTableColWidths(null, 4),
  }
}

function FooterHtml({ html }: { html: string }) {
  if (!html?.trim()) return null
  return (
    <div
      className="prose prose-sm max-w-none text-ink"
      dangerouslySetInnerHTML={{ __html: sanitizeCmsHtml(html) }}
    />
  )
}

function ShowMoreButton({
  expanded,
  onToggle,
  moreLabel = "Показать больше",
  lessLabel = "Свернуть",
}: {
  expanded: boolean
  onToggle: () => void
  moreLabel?: string
  lessLabel?: string
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="inline-flex items-center gap-2 rounded border border-cyan-accent bg-white px-6 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-cream"
    >
      {expanded ? lessLabel : moreLabel}
      <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
    </button>
  )
}

/* ------------------------------------------------------------------ */
/* Single table                                                         */
/* ------------------------------------------------------------------ */

function ResortMobileCardFields({
  fields,
}: {
  fields: { col: string; value: string; ci: number }[]
}) {
  if (!fields.length) return null
  return (
    <dl className="space-y-4 p-4">
      {fields.map(({ col, value, ci }) => (
        <div key={ci} className="min-w-0">
          <dt className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-ink-muted/80">
            {col}
          </dt>
          <dd className="block break-words text-sm leading-relaxed text-ink">
            <CellHtml value={value} className="prose-content" />
          </dd>
        </div>
      ))}
    </dl>
  )
}

function ResortMobileCard({
  title,
  fields,
  defaultOpen,
}: {
  title: string
  fields: { col: string; value: string; ci: number }[]
  defaultOpen: boolean
}) {
  const collapsible = useResortCardCollapsible()
  const [open, setOpen] = useState(defaultOpen)

  // Tablet+ (sm:grid-cols-2): always fully open, no chevron (#98)
  if (!collapsible) {
    return (
      <article className="overflow-hidden rounded-xl border border-line bg-white shadow-sm">
        <div className="rounded-t-xl border-b border-line/60 bg-cream/60 p-4">
          <h3 className="min-w-0 text-lg font-bold text-balance text-ink">{title}</h3>
        </div>
        <ResortMobileCardFields fields={fields} />
      </article>
    )
  }

  return (
    <details
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
      className="group overflow-hidden rounded-xl border border-line bg-white shadow-sm"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-t-xl border-b border-line/60 bg-cream/60 p-4 [&::-webkit-details-marker]:hidden">
        <h3 className="min-w-0 flex-1 text-lg font-bold text-balance text-ink">{title}</h3>
        <ChevronDown
          className="h-5 w-5 shrink-0 text-ink-muted transition-transform group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <ResortMobileCardFields fields={fields} />
    </details>
  )
}

function ResortTable({ data }: { data: ResortTableData }) {
  const [expanded, setExpanded] = useState(false)
  if (!data.rows.length) return null

  const collapsible = data.rows.length > RESORT_COLLAPSED_ROWS
  const visibleRows = visibleSlice(data.rows, expanded, RESORT_COLLAPSED_ROWS)

  return (
    <>
      {/* Desktop table */}
      <div className="relative hidden overflow-hidden rounded-xl border border-brand lg:block">
        <div className="overflow-x-auto">
          <table className="public-desktop-table w-full border-collapse text-left">
            <colgroup>
              {data.columns.map((_, i) => (
                <col key={i} style={publicColStyle(data.colWidths[String(i)])} />
              ))}
            </colgroup>
            <thead>
              <tr className="bg-brand text-brand-foreground">
                {data.columns.map((col, i) => (
                  <th
                    key={col || `col-${i}`}
                    className="border-b border-line px-4 py-4 text-sm font-semibold sm:text-base"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row, ri) => (
                <tr key={ri} className={ri % 2 ? "bg-cream" : "bg-white"}>
                  {row.map((cell, ci) => (
                    <td
                      key={ci}
                      className="border-b border-line px-4 py-5 align-top text-sm font-normal leading-relaxed text-ink"
                    >
                      <CellHtml value={cell} className="prose-content" />
                    </td>
                  ))}
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
              <ShowMoreButton expanded={expanded} onToggle={() => setExpanded((v) => !v)} />
            </div>
          </>
        ) : null}
      </div>

      {/* Mobile + tablet cards — accordion, first open */}
      <div className="grid gap-4 sm:grid-cols-2 lg:hidden">
        {visibleRows.map((row, ri) => {
          const title = stripHtml(row[0] || "") || `Строка ${ri + 1}`
          const fields = data.columns
            .map((col, ci) => ({ col, value: row[ci]?.trim() || "", ci }))
            .filter((f) => f.ci > 0 && stripHtml(f.value))
          return (
            <ResortMobileCard key={ri} title={title} fields={fields} defaultOpen={ri === 0} />
          )
        })}
      </div>
      {collapsible ? (
        <div className="text-center lg:hidden">
          <ShowMoreButton expanded={expanded} onToggle={() => setExpanded((v) => !v)} />
        </div>
      ) : null}
    </>
  )
}

function ResortTableSection({
  data,
  defaultOpen,
}: {
  data: ResortTableData
  defaultOpen: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const hasHeader = Boolean(data.title || data.subtitle)
  if (!hasHeader) {
    return (
      <div className="space-y-3">
        <ResortTable data={data} />
        <FooterHtml html={data.footer} />
      </div>
    )
  }

  return (
    <details
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
      className="group space-y-3"
    >
      <summary className="flex cursor-pointer list-none items-start justify-between gap-3 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0 flex-1 space-y-3">
          {data.title ? <TitleUnderline as="h2">{data.title}</TitleUnderline> : null}
          {data.subtitle ? (
            <div
              className="prose prose-sm max-w-none text-ink"
              dangerouslySetInnerHTML={{ __html: sanitizeCmsHtml(data.subtitle) }}
            />
          ) : null}
        </span>
        <ChevronDown
          className="mt-1 h-5 w-5 shrink-0 text-ink-muted transition-transform group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <ResortTable data={data} />
      <FooterHtml html={data.footer} />
    </details>
  )
}

/* ------------------------------------------------------------------ */
/* Multi-table renderer (new API — accepts ContentBlock[])             */
/* ------------------------------------------------------------------ */

export function ResortComparisonBlocks({
  blocks,
  sectionTitle,
}: {
  blocks: ContentBlock[]
  /** Optional H2 shown above all tables (from page settings) */
  sectionTitle?: string
}) {
  const [showAllTables, setShowAllTables] = useState(false)

  if (!blocks.length) return null

  // Group legacy rows (no extra.columns) into a single synthetic table
  const legacyBlocks = blocks.filter(
    (b) => !Array.isArray((b.extra as Record<string, unknown>)?.columns),
  )
  const newBlocks = blocks.filter((b) =>
    Array.isArray((b.extra as Record<string, unknown>)?.columns),
  )

  const legacyData: ResortTableData | null =
    legacyBlocks.length > 0
      ? {
          title: "",
          subtitle: "",
                    footer: "",
          columns: ["Курорт", "Кому подходит", "Сильные стороны", "Возможные нюансы"],
          rows: legacyBlocks.map((b) => [b.title, b.subtitle, b.body, b.icon]),
          colWidths: resolveTableColWidths(null, 4),
        }
      : null

  const tables: ResortTableData[] = [
    ...(legacyData ? [legacyData] : []),
    ...newBlocks.map(parseBlock),
  ].filter((t) => t.rows.length > 0)

  if (!tables.length) return null

  // H2 = block.title from ResortTableBuilder (sectionTitle ignored — legacy settings.resortsTitle removed)
  void sectionTitle

  const tablesCollapsible = tables.length > RESORT_COLLAPSED_TABLES
  const visibleTables = visibleSlice(tables, showAllTables, RESORT_COLLAPSED_TABLES)

  return (
    <section className="space-y-8">
      {visibleTables.map((t, i) => (
        <div key={t.title || `resort-table-${i}`} className="space-y-3">
          <ResortTableSection data={t} defaultOpen={i === 0} />
        </div>
      ))}
      {tablesCollapsible ? (
        <div className="text-center">
          <ShowMoreButton
            expanded={showAllTables}
            onToggle={() => setShowAllTables((v) => !v)}
            moreLabel="Показать больше таблиц"
            lessLabel="Свернуть таблицы"
          />
        </div>
      ) : null}
    </section>
  )
}
