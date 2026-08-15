"use client"

import { Node, mergeAttributes } from "@tiptap/core"
import {
  NodeViewContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react"
import { GripVertical, Images, Type, X } from "lucide-react"
import { useEffect, useState, type DragEvent } from "react"
import { MediaPickerDialog } from "@/components/admin/media-picker-dialog"
import type { UploadedFile } from "@/components/admin/media-uploader"
import { clampMediaColumns, isMediaGridFirstRowIndex } from "./media-helpers"
import { MEDIA_GRID_CELL_MIME, moveMediaGridCell } from "./media-grid-dnd"

function isEmptyParagraph(node: { type: { name: string }; content: { size: number } } | null | undefined) {
  return !!node && node.type.name === "paragraph" && node.content.size === 0
}

function resolveCellGridIndex(
  editor: NodeViewProps["editor"],
  getPos: NodeViewProps["getPos"],
): { index: number; cols: number; gridChildCount: number } | null {
  const pos = getPos()
  if (typeof pos !== "number") return null
  const $pos = editor.state.doc.resolve(pos)
  for (let depth = $pos.depth; depth > 0; depth--) {
    if ($pos.node(depth).type.name !== "mediaGrid") continue
    const grid = $pos.node(depth)
    return {
      index: $pos.index(depth),
      cols: clampMediaColumns(grid.attrs.cols),
      gridChildCount: grid.childCount,
    }
  }
  return null
}

function CellNodeView({ node, editor, getPos, selected }: NodeViewProps) {
  const pos = getPos()
  const cellPos = typeof pos === "number" ? pos : -1
  const [pickerOpen, setPickerOpen] = useState(false)
  const [dropOver, setDropOver] = useState(false)
  const [gridMeta, setGridMeta] = useState(() => resolveCellGridIndex(editor, getPos))
  const empty = node.childCount === 0
  const onlyEmptyText = node.childCount === 1 && isEmptyParagraph(node.firstChild)
  const isMediaCell =
    !empty &&
    (node.firstChild?.type.name === "image" || node.firstChild?.type.name === "video")
  const inFirstRow = gridMeta ? isMediaGridFirstRowIndex(gridMeta.index, gridMeta.cols) : true
  const canRemoveCell = !!gridMeta && !inFirstRow && gridMeta.gridChildCount > 1

  useEffect(() => {
    const sync = () => setGridMeta(resolveCellGridIndex(editor, getPos))
    sync()
    editor.on("transaction", sync)
    return () => {
      editor.off("transaction", sync)
    }
  }, [editor, getPos])

  useEffect(() => {
    if (!onlyEmptyText) return

    const clearIfBlurred = () => {
      const pos = getPos()
      if (typeof pos !== "number") return
      const { from, to } = editor.state.selection
      const cellFrom = pos
      const cellTo = pos + node.nodeSize
      const inside = from >= cellFrom && to <= cellTo
      if (inside) return
      editor
        .chain()
        .command(({ tr }) => {
          const cell = tr.doc.nodeAt(pos)
          if (!cell || cell.type.name !== "mediaGridCell") return false
          tr.replaceWith(pos, pos + cell.nodeSize, cell.type.create())
          return true
        })
        .run()
    }

    editor.on("selectionUpdate", clearIfBlurred)
    editor.on("blur", clearIfBlurred)
    return () => {
      editor.off("selectionUpdate", clearIfBlurred)
      editor.off("blur", clearIfBlurred)
    }
  }, [editor, getPos, node.nodeSize, onlyEmptyText])

  function insertChild(content: { type: string; attrs?: Record<string, unknown> }) {
    const pos = getPos()
    if (typeof pos !== "number") return
    editor
      .chain()
      .focus()
      .insertContentAt({ from: pos + 1, to: pos + node.nodeSize - 1 }, content)
      .run()
  }

  function clearCell() {
    const pos = getPos()
    if (typeof pos !== "number") return
    editor
      .chain()
      .command(({ tr }) => {
        const cell = tr.doc.nodeAt(pos)
        if (!cell || cell.type.name !== "mediaGridCell") return false
        tr.replaceWith(pos, pos + cell.nodeSize, cell.type.create())
        return true
      })
      .setNodeSelection(pos)
      .run()
  }

  function removeCell() {
    if (!canRemoveCell) return
    const pos = getPos()
    if (typeof pos !== "number") return
    editor
      .chain()
      .focus()
      .command(({ tr }) => {
        const cell = tr.doc.nodeAt(pos)
        if (!cell || cell.type.name !== "mediaGridCell") return false
        const $pos = tr.doc.resolve(pos)
        let gridDepth = -1
        for (let depth = $pos.depth; depth > 0; depth--) {
          if ($pos.node(depth).type.name === "mediaGrid") {
            gridDepth = depth
            break
          }
        }
        if (gridDepth < 0) return false
        const grid = $pos.node(gridDepth)
        const index = $pos.index(gridDepth)
        const cols = clampMediaColumns(grid.attrs.cols)
        if (isMediaGridFirstRowIndex(index, cols)) return false
        if (grid.childCount <= 1) return false
        tr.delete(pos, pos + cell.nodeSize)
        return true
      })
      .run()
  }

  function startText() {
    const pos = getPos()
    if (typeof pos !== "number") return
    editor
      .chain()
      .focus()
      .insertContentAt({ from: pos + 1, to: pos + node.nodeSize - 1 }, { type: "paragraph" })
      .setTextSelection(pos + 2)
      .run()
  }

  function pickMedia(file: UploadedFile) {
    if (file.type !== "image" && file.type !== "video") return
    const type = file.type === "video" ? "video" : "image"
    insertChild({
      type,
      attrs:
        type === "image"
          ? { src: file.url, alt: file.alt || file.name, alignment: "center" }
          : { src: file.url, alignment: "center" },
    })
    setPickerOpen(false)
  }

  function handleDragStart(event: DragEvent<HTMLDivElement>) {
    const pos = getPos()
    if (typeof pos !== "number") {
      event.preventDefault()
      return
    }
    event.dataTransfer.effectAllowed = "move"
    event.dataTransfer.setData(MEDIA_GRID_CELL_MIME, String(pos))
    event.dataTransfer.setData("text/plain", String(pos))
    event.currentTarget.classList.add("seo-media-grid-drag--dragging")
  }

  function handleDragEnd(event: DragEvent<HTMLDivElement>) {
    event.currentTarget.classList.remove("seo-media-grid-drag--dragging")
    setDropOver(false)
  }

  function hasCellPayload(event: DragEvent) {
    return Array.from(event.dataTransfer.types).includes(MEDIA_GRID_CELL_MIME)
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    if (!hasCellPayload(event)) return
    event.preventDefault()
    event.dataTransfer.dropEffect = "move"
    setDropOver(true)
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    const related = event.relatedTarget
    if (related instanceof globalThis.Node && event.currentTarget.contains(related)) return
    setDropOver(false)
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    event.stopPropagation()
    setDropOver(false)
    const raw = event.dataTransfer.getData(MEDIA_GRID_CELL_MIME) || event.dataTransfer.getData("text/plain")
    const fromPos = Number(raw)
    const toPos = getPos()
    if (!Number.isFinite(fromPos) || typeof toPos !== "number") return
    editor
      .chain()
      .focus()
      .command(({ tr }) => moveMediaGridCell(tr, fromPos, toPos))
      .run()
  }

  return (
    <NodeViewWrapper
      className={`seo-media-grid-cell ${empty ? "seo-media-grid-cell--empty" : "seo-media-grid-cell--filled"}${dropOver ? " seo-media-grid-cell--drop" : ""}`}
      data-selected={selected ? "1" : undefined}
      data-cell-kind={empty ? undefined : isMediaCell ? "media" : "text"}
      data-cell-pos={cellPos >= 0 ? cellPos : undefined}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {empty ? (
        <>
          <div className="seo-media-grid-cell-chrome" contentEditable={false}>
            <div
              className="seo-media-grid-drag"
              data-drag-handle=""
              data-cell-pos={cellPos >= 0 ? cellPos : undefined}
              draggable={true}
              role="button"
              tabIndex={0}
              aria-label="Перетащить ячейку"
              title="Перетащить"
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <GripVertical className="h-4 w-4" aria-hidden />
            </div>
            {canRemoveCell ? (
              <button
                type="button"
                className="seo-media-grid-remove"
                aria-label="Удалить элемент"
                title="Удалить элемент"
                onMouseDown={(e) => e.preventDefault()}
                onClick={removeCell}
              >
                <X className="h-3.5 w-3.5" aria-hidden strokeWidth={2.5} />
              </button>
            ) : (
              <span className="seo-media-grid-cell-chrome-spacer" aria-hidden />
            )}
          </div>
          <div className="seo-media-grid-chooser" role="group" aria-label="Наполнение ячейки" contentEditable={false}>
            <button
              type="button"
              className="seo-media-grid-chooser-btn"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setPickerOpen(true)}
            >
              <Images className="h-4 w-4" aria-hidden />
              Медиа
            </button>
            <button
              type="button"
              className="seo-media-grid-chooser-btn"
              onMouseDown={(e) => e.preventDefault()}
              onClick={startText}
            >
              <Type className="h-4 w-4" aria-hidden />
              Текст
            </button>
          </div>
          <MediaPickerDialog open={pickerOpen} onPick={pickMedia} onClose={() => setPickerOpen(false)} />
        </>
      ) : (
        <>
          {/* First row: clear content only. Outside first row: remove whole cell. Never both X. */}
          {inFirstRow ? (
            <button
              type="button"
              className={`seo-media-grid-clear${isMediaCell ? " seo-media-grid-clear--media" : ""}`}
              aria-label="Удалить содержимое ячейки"
              title="Удалить содержимое"
              contentEditable={false}
              onMouseDown={(e) => e.preventDefault()}
              onClick={clearCell}
            >
              <X className="h-4 w-4" aria-hidden strokeWidth={2.5} />
            </button>
          ) : canRemoveCell ? (
            <button
              type="button"
              className="seo-media-grid-remove"
              aria-label="Удалить элемент"
              title="Удалить элемент"
              contentEditable={false}
              onMouseDown={(e) => e.preventDefault()}
              onClick={removeCell}
            >
              <X className="h-3.5 w-3.5" aria-hidden strokeWidth={2.5} />
            </button>
          ) : null}
          <div
            className="seo-media-grid-drag"
            data-drag-handle=""
            data-cell-pos={cellPos >= 0 ? cellPos : undefined}
            draggable={true}
            contentEditable={false}
            role="button"
            tabIndex={0}
            aria-label="Перетащить ячейку"
            title="Перетащить"
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <GripVertical className="h-4 w-4" aria-hidden />
          </div>
        </>
      )}
      <NodeViewContent
        className={`seo-media-grid-cell-content${empty ? " seo-media-grid-cell-content--empty" : ""}`}
      />
    </NodeViewWrapper>
  )
}

export const MediaGridCell = Node.create({
  name: "mediaGridCell",
  group: "mediaGridCell",
  content: "(paragraph | heading | blockquote | bulletList | orderedList | image | video)*",
  isolating: false,
  defining: true,
  draggable: true,
  selectable: true,

  parseHTML() {
    return [{ tag: "div.seo-media-grid-cell" }]
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { class: "seo-media-grid-cell" }), 0]
  },

  addNodeView() {
    return ReactNodeViewRenderer(CellNodeView)
  },
})
