"use client"

import { useActionState, useContext, useEffect, useMemo, useRef, useState } from "react"
import { Plus, Trash2, ChevronUp, ChevronDown, GripVertical, X, AlertCircle, CheckCircle2, Loader2 } from "lucide-react"
import type { ContentBlock } from "@/lib/types"
import {
  saveBlockAction,
  deleteBlockAction,
  moveBlockAction,
} from "@/app/admin/cms-actions"
import { Button, Card, CardBody, CardHeader, CardTitle, Input, Label, TableWrap, Tbody, Td, Th, Thead, Tr } from "@/components/admin/ui"
import { RichEditor } from "@/components/admin/rich-editor"
import { CellRichEditor } from "@/components/admin/cell-rich-editor"
import { PublicTableColHeader } from "@/components/admin/public-table-col-header"
import {
  resolveTableColWidths,
  type PublicColWidth,
  type PublicColWidthsMap,
} from "@/lib/public-table-col-widths"
import { PageSettingsFormContext } from "@/components/admin/page-settings-form"
import type { DraftContributor } from "@/components/admin/draft-coordinator"
import type { AdminSaveResult } from "@/lib/admin-save-state"

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface ResortTableData {
  title: string
  subtitle: string
  /** Rich text under the grid (new-format body). */
  footer: string
  columns: string[]
  rows: string[][]
  colWidths: PublicColWidthsMap
}

function parseTableBlock(b: ContentBlock): ResortTableData {
  const ex = b.extra as Record<string, unknown>

  // New format: extra.columns + extra.rows; body = text under table
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

  // Legacy format: title=resort, subtitle=audience, body=pros, icon=cons
  return {
    title: "",
    subtitle: "",
    footer: "",
    columns: ["Курорт", "Кому подходит", "Сильные стороны", "Возможные нюансы"],
    rows: [[b.title, b.subtitle, b.body, b.icon]],
    colWidths: resolveTableColWidths(null, 4),
  }
}

/* ------------------------------------------------------------------ */
/* Inline editable table                                               */
/* ------------------------------------------------------------------ */

interface TableEditorProps {
  pageKey: string
  returnTo: string
  block?: ContentBlock
  onDone: () => void
  isNew?: boolean
}

function serializeTableState(t: Pick<ResortTableData, "title" | "subtitle" | "footer" | "columns" | "rows" | "colWidths">) {
  return JSON.stringify([t.title, t.subtitle, t.footer, t.columns, t.rows, t.colWidths])
}

function TableEditor({ pageKey, returnTo, block, onDone, isNew }: TableEditorProps) {
  const ctx = useContext(PageSettingsFormContext)
  const initial = block
    ? parseTableBlock(block)
    : {
        title: "",
        subtitle: "",
        footer: "",
        columns: ["Курорт", "Кому подходит", "Сильные стороны", "Возможные нюансы"],
        rows: [["", "", "", ""]],
        colWidths: resolveTableColWidths(null, 4),
      }

  const [title, setTitle] = useState(initial.title)
  const [subtitle, setSubtitle] = useState(initial.subtitle)
  const [footer, setFooter] = useState(initial.footer)
  const [columns, setColumns] = useState<string[]>(initial.columns)
  const [colWidths, setColWidths] = useState<PublicColWidthsMap>(initial.colWidths)
  const [rows, setRows] = useState<string[][]>(
    initial.rows.length
      ? initial.rows.map((r) => {
          // Pad row to match column count
          const padded = [...r]
          while (padded.length < initial.columns.length) padded.push("")
          return padded
        })
      : [[...Array(initial.columns.length).fill("")]]
  )
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const savePromiseRef = useRef<Promise<void> | null>(null)

  const baselineRef = useRef(serializeTableState(initial))
  const formRef = useRef<HTMLFormElement>(null)

  const isDirty = useMemo(() => serializeTableState({ title, subtitle, footer, columns, rows, colWidths }) !== baselineRef.current,
    [title, subtitle, footer, columns, rows, colWidths])

  async function saveCurrentTable(): Promise<AdminSaveResult> {
    if (savePromiseRef.current) {
      await savePromiseRef.current
      return { ok: true }
    }
    setSaveStatus("saving")
    const form = formRef.current
    if (!form) {
      setSaveStatus("error")
      return { ok: false, error: "Форма таблицы не найдена" }
    }
    const fd = new FormData(form)
    const p = (async () => {
      try {
        const raw = await saveBlockAction(null, fd)
        const ok = "ok" in raw && raw.ok
        const res: AdminSaveResult = ok
          ? { ok: true }
          : { ok: false, error: "error" in raw ? String((raw as { error: unknown }).error ?? "Сохранение не удалось") : "Сохранение не удалось" }
        if (res.ok) {
          setSaveStatus("saved")
          baselineRef.current = serializeTableState({ title, subtitle, footer, columns, rows, colWidths })
          setTimeout(() => { setSaveStatus((s) => (s === "saved" ? "idle" : s)) }, 1800)
        } else {
          setSaveStatus("error")
        }
        return res
      } finally {
        savePromiseRef.current = null
      }
    })()
    savePromiseRef.current = p.then(() => {})
    return p
  }

  const draftRef = useRef<DraftContributor | null>(null)
  draftRef.current = {
    id: `resortTable:${isNew ? "new" : block?.id ?? "new"}`,
    label: isNew ? `Новая таблица` : `Таблица «${block?.title || "без названия"}»`,
    isDirty: () => isDirty,
    async save(): Promise<AdminSaveResult> {
      const res = await saveCurrentTable()
      if (res?.ok) return res
      return { ok: true }
    },
    commitBaseline() {
      baselineRef.current = serializeTableState({ title, subtitle, footer, columns, rows, colWidths })
      setSaveStatus("idle")
    },
    reset() {
      setTitle(initial.title)
      setSubtitle(initial.subtitle)
      setFooter(initial.footer)
      setColumns(initial.columns)
      setColWidths(initial.colWidths)
      setRows(initial.rows.length ? initial.rows.map((r) => { const p = [...r]; while (p.length < initial.columns.length) p.push(""); return p }) : [[...Array(initial.columns.length).fill("")]])
      baselineRef.current = serializeTableState(initial)
      setSaveStatus("idle")
    },
  }

  useEffect(() => {
    if (!ctx) return
    const unreg = ctx.registerDraft(draftRef.current!)
    return unreg
  }, [ctx])

  /* Column operations */
  const addColumn = () => {
    setColWidths((current) => ({
      ...current,
      [columns.length]: { mode: "fill", minPx: 140 },
    }))
    setColumns((c) => [...c, ""])
    setRows((rs) => rs.map((r) => [...r, ""]))
  }
  const removeColumn = (ci: number) => {
    if (columns.length <= 1) return
    setColWidths((current) =>
      Object.fromEntries(
        columns.flatMap((_, index) =>
          index === ci
            ? []
            : [
                [
                  String(index > ci ? index - 1 : index),
                  current[String(index)] ?? { mode: "fill", minPx: 140 },
                ],
              ],
        ),
      ),
    )
    setColumns((c) => c.filter((_, i) => i !== ci))
    setRows((rs) => rs.map((r) => r.filter((_, i) => i !== ci)))
  }
  const setColWidth = (ci: number, next: PublicColWidth) =>
    setColWidths((current) => ({ ...current, [ci]: next }))
  const updateColumn = (ci: number, val: string) =>
    setColumns((c) => c.map((v, i) => (i === ci ? val : v)))

  /* Row operations */
  const addRow = () => setRows((rs) => [...rs, Array(columns.length).fill("")])
  const removeRow = (ri: number) => setRows((rs) => rs.filter((_, i) => i !== ri))
  const updateCell = (ri: number, ci: number, val: string) =>
    setRows((rs) => rs.map((r, i) => (i === ri ? r.map((c, j) => (j === ci ? val : c)) : r)))
  const moveRow = (ri: number, dir: -1 | 1) => {
    const ni = ri + dir
    if (ni < 0 || ni >= rows.length) return
    setRows((rs) => {
      const next = [...rs]
      ;[next[ri], next[ni]] = [next[ni], next[ri]]
      return next
    })
  }

  return (
    <div className="space-y-5 rounded-xl border border-admin-border bg-white p-5 shadow-sm">
      {/* Header fields */}
      <div className="space-y-3">
        <div>
          <Label htmlFor={`rt-title-${block?.id ?? "new"}`}>Заголовок таблицы</Label>
          <Input
            id={`rt-title-${block?.id ?? "new"}`}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Сравнение курортов Египта"
          />
        </div>
        <div>
          <Label>Текст под заголовком</Label>
          <RichEditor
            name="__subtitle_ignored"
            defaultValue={subtitle}
            placeholder="Краткое пояснение к таблице"
            onChange={setSubtitle}
            minHeight="80px"
          />
        </div>
      </div>

      {/* Inline table */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] text-admin-fg-muted">
          Шестерёнка — ширина колонки на сайте.
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 text-xs"
          onClick={() => setColWidths(resolveTableColWidths(null, columns.length))}
        >
          Сбросить ширины
        </Button>
      </div>
      <TableWrap>
        <Thead>
          <Tr className="hover:bg-transparent">
            <Th actions className="sr-only">
              Порядок
            </Th>
            {columns.map((col, ci) => (
              <Th key={ci} className="normal-case tracking-normal align-top">
                <div className="flex items-center gap-1 pr-2">
                  <Input
                    className="h-7 min-w-[100px] text-xs font-semibold"
                    value={col}
                    onChange={(e) => updateColumn(ci, e.target.value)}
                    placeholder={`Колонка ${ci + 1}`}
                  />
                  <PublicTableColHeader
                    label={col || `Колонка ${ci + 1}`}
                    value={colWidths[String(ci)] ?? { mode: "fill", minPx: 140 }}
                    onChange={(next) => setColWidth(ci, next)}
                    className="shrink-0"
                    description="Меняет эту таблицу на публичной странице."
                    hideLabel
                  />
                  <button
                    type="button"
                    onClick={() => removeColumn(ci)}
                    className="shrink-0 text-admin-fg-muted hover:text-red-500"
                    title="Удалить колонку"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </Th>
            ))}
            <Th actions>
              <button
                type="button"
                onClick={addColumn}
                className="flex items-center gap-1 rounded px-2 py-1 text-xs font-normal normal-case tracking-normal text-admin-fg-muted hover:bg-admin-muted hover:text-admin-fg"
              >
                <Plus className="h-3 w-3" />
                Колонка
              </button>
            </Th>
          </Tr>
        </Thead>
        <Tbody>
          {rows.map((row, ri) => (
            <Tr key={ri} className={ri % 2 ? "bg-cream/30 hover:bg-cream/40" : "bg-white"}>
              <Td actions className="align-middle">
                <div className="flex flex-col items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => moveRow(ri, -1)}
                    disabled={ri === 0}
                    className="rounded p-0.5 text-admin-fg-muted hover:bg-admin-muted disabled:opacity-30"
                  >
                    <ChevronUp className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveRow(ri, 1)}
                    disabled={ri === rows.length - 1}
                    className="rounded p-0.5 text-admin-fg-muted hover:bg-admin-muted disabled:opacity-30"
                  >
                    <ChevronDown className="h-3 w-3" />
                  </button>
                </div>
              </Td>
              {row.map((cell, ci) => (
                <Td key={ci} className="p-1 align-top">
                  <CellRichEditor
                    className="min-w-[140px]"
                    value={cell}
                    onChange={(html) => updateCell(ri, ci, html)}
                    placeholder="Текст ячейки"
                  />
                </Td>
              ))}
              <Td actions className="align-middle">
                <button
                  type="button"
                  onClick={() => removeRow(ri)}
                  disabled={rows.length <= 1}
                  className="rounded p-1 text-admin-fg-muted hover:text-red-500 disabled:opacity-30"
                  title="Удалить строку"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </TableWrap>

      <Button type="button" variant="secondary" size="sm" onClick={addRow}>
        <Plus className="h-4 w-4" />
        Добавить строку
      </Button>

      <div>
        <Label>Текст под таблицей</Label>
        <RichEditor
          name="__footer_ignored"
          defaultValue={footer}
          placeholder="Пояснение или сноски под таблицей"
          onChange={setFooter}
          minHeight="80px"
        />
      </div>

      {/* Hidden form for server action */}
      <form ref={formRef} className="hidden">
        <input name="collection" value="resort" readOnly />
        <input name="page" value={pageKey} readOnly />
        <input name="visible" value="1" readOnly />
        <input name="__returnTo" value={returnTo} readOnly />
        {block && <input name="id" value={block.id} readOnly />}
        <input name="title" value={title} readOnly />
        <input name="subtitle" value={subtitle} readOnly />
        {/* body = text under table; grid packed as tableJson */}
        <input name="body" value={footer} readOnly />
        <input name="tableJson" value={JSON.stringify({ columns, rows, colWidths })} readOnly />
        <input name="icon" value="" readOnly />
      </form>

      {/* Variant A sticky save bar: status indicators + 44px buttons */}
      <div className="sticky bottom-0 z-10 -mx-5 -mb-5 mt-6 flex flex-col-reverse gap-3 border-t border-admin-border bg-gradient-to-b from-white/90 to-white px-5 py-4 backdrop-blur supports-[backdrop-filter]:bg-white/80 sm:flex-row sm:items-center sm:justify-between sm:py-4">
        <div className="flex items-center gap-2 text-sm" aria-live="polite">
          {saveStatus === "saving" ? (
            <span className="flex items-center gap-1.5 text-amber-700">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Сохранение…</span>
            </span>
          ) : saveStatus === "saved" ? (
            <span className="flex items-center gap-1.5 text-green-700">
              <CheckCircle2 className="h-4 w-4" />
              <span>Сохранено</span>
            </span>
          ) : saveStatus === "error" ? (
            <span className="flex items-center gap-1.5 text-red-700">
              <AlertCircle className="h-4 w-4" />
              <span>Ошибка сохранения — см. сообщение выше</span>
            </span>
          ) : isDirty ? (
            <span className="flex items-center gap-1.5 text-admin-fg-muted">
              <span className="h-2 w-2 rounded-full bg-amber-400 ring-2 ring-amber-100" />
              <span>Есть несохранённые изменения</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-admin-fg-muted">
              <CheckCircle2 className="h-3.5 w-3.5 opacity-60" />
              <span>Изменений нет</span>
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            className="h-11 min-w-[110px] sm:text-sm"
            onClick={onDone}
          >
            Отмена
          </Button>
          <Button
            type="button"
            className="h-11 min-w-[140px] sm:text-sm"
            disabled={saveStatus === "saving"}
            onClick={async () => {
              const r = await saveCurrentTable()
              if (r?.ok) {
                setTimeout(() => onDone(), 200)
              }
            }}
          >
            {saveStatus === "saving" ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="h-4 w-4 animate-spin" /> Сохранение…
              </span>
            ) : isDirty ? (
              isNew ? "Добавить таблицу" : "Сохранить таблицу"
            ) : isNew ? (
              "Добавить (нет изменений)"
            ) : (
              "Сохранено"
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Delete button                                                        */
/* ------------------------------------------------------------------ */

function DeleteTableButton({ id }: { id: number }) {
  return (
    <form action={deleteBlockAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="collection" value="resort" />
      <button
        type="submit"
        title="Удалить таблицу"
        className="grid h-8 w-8 place-items-center rounded-md border border-transparent text-admin-fg-muted transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
        onClick={(e) => {
          if (!confirm("Удалить эту таблицу сравнения курортов?")) e.preventDefault()
        }}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </form>
  )
}

/* Move up/down */
function MoveButtons({ id, direction }: { id: number; direction: "up" | "down" }) {
  const Icon = direction === "up" ? ChevronUp : ChevronDown
  return (
    <form action={moveBlockAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="direction" value={direction} />
      <input type="hidden" name="collection" value="resort" />
      <button
        type="submit"
        title={direction === "up" ? "Выше" : "Ниже"}
        className="grid h-6 w-7 place-items-center rounded text-admin-fg-muted hover:bg-admin-muted hover:text-admin-fg"
      >
        <Icon className="h-3.5 w-3.5" />
      </button>
    </form>
  )
}

/* ------------------------------------------------------------------ */
/* Collapsed preview of a table                                        */
/* ------------------------------------------------------------------ */

function TablePreview({
  block,
  onEdit,
}: {
  block: ContentBlock
  onEdit: () => void
}) {
  const data = parseTableBlock(block)
  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-admin-fg">
            {data.title || <span className="italic text-admin-fg-muted">Без заголовка</span>}
          </p>
          {data.subtitle && (
            <p
              className="text-xs text-admin-fg-muted"
              dangerouslySetInnerHTML={{
                __html: data.subtitle.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
              }}
            />
          )}
          <p className="mt-1 text-xs text-admin-fg-muted">
            Колонки: {data.columns.join(" · ")} &nbsp;·&nbsp; Строк: {data.rows.length}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <div className="flex flex-col">
            <MoveButtons id={block.id} direction="up" />
            <MoveButtons id={block.id} direction="down" />
          </div>
          <button
            type="button"
            onClick={onEdit}
            className="rounded-md border border-admin-border bg-admin-muted px-3 py-1 text-xs font-medium text-admin-fg hover:bg-admin-border"
          >
            Редактировать
          </button>
          <DeleteTableButton id={block.id} />
        </div>
      </div>

      {/* Micro preview table */}
      {data.rows.length > 0 && (
        <div className="overflow-x-auto rounded border border-admin-border">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-brand text-brand-foreground">
                {data.columns.map((col, ci) => (
                  <th key={ci} className="px-2 py-1.5 text-left font-semibold">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.rows.slice(0, 3).map((row, ri) => (
                <tr key={ri} className={ri % 2 ? "bg-cream/40" : "bg-white"}>
                  {row.map((cell, ci) => {
                    const plain = cell.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
                    return (
                      <td key={ci} className="border-t border-admin-border px-2 py-1.5 align-top">
                        {plain ? (
                          <span className="line-clamp-2">{plain}</span>
                        ) : (
                          <span className="text-admin-fg-muted/50">—</span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
              {data.rows.length > 3 && (
                <tr>
                  <td
                    colSpan={data.columns.length}
                    className="border-t border-admin-border px-2 py-1 text-center text-admin-fg-muted"
                  >
                    +{data.rows.length - 3} строк ещё…
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Main export                                                          */
/* ------------------------------------------------------------------ */

export function ResortTableBuilder({
  pageKey,
  blocks,
  returnTo,
}: {
  pageKey: string
  blocks: ContentBlock[]
  returnTo: string
}) {
  const [editingId, setEditingId] = useState<number | "new" | null>(null)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Таблицы</CardTitle>
      </CardHeader>
      <CardBody className="space-y-4">
        <p className="text-xs text-admin-fg-muted">
          Каждый блок ниже — отдельная таблица. Секций «Таблица» можно добавить несколько — каждая
          выбирает нужную таблицу через выпадающий список.
        </p>

        {blocks.length === 0 && editingId !== "new" && (
          <p className="rounded-md border border-dashed border-admin-border py-8 text-center text-sm text-admin-fg-muted">
            Таблиц пока нет. Добавьте первую.
          </p>
        )}

        <div className="space-y-4">
          {blocks.map((block) =>
            editingId === block.id ? (
              <TableEditor
                key={block.id}
                pageKey={pageKey}
                returnTo={returnTo}
                block={block}
                onDone={() => setEditingId(null)}
              />
            ) : (
              <div
                key={block.id}
                className="rounded-xl border border-admin-border bg-admin-muted/20 p-4"
              >
                <TablePreview block={block} onEdit={() => setEditingId(block.id)} />
              </div>
            )
          )}
        </div>

        {editingId === "new" ? (
          <TableEditor
            pageKey={pageKey}
            returnTo={returnTo}
            isNew
            onDone={() => setEditingId(null)}
          />
        ) : (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setEditingId("new")}
          >
            <Plus className="h-4 w-4" />
            Добавить таблицу
          </Button>
        )}
      </CardBody>
    </Card>
  )
}
