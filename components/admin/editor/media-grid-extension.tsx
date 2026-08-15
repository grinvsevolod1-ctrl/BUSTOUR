"use client"

import { Node, mergeAttributes } from "@tiptap/core"
import {
  NodeViewContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react"
import { Fragment, type Node as ProseMirrorNode } from "@tiptap/pm/model"
import { Plugin, PluginKey } from "@tiptap/pm/state"
import { Plus } from "lucide-react"
import { useEffect, useState } from "react"
import { Button } from "@/components/admin/ui"
import {
  canAddMediaGridElement,
  clampMediaColumns,
  gridChildCountForColumns,
  isChooserMediaGridCell,
} from "./media-helpers"
import { MediaGridCell } from "./media-grid-cell-extension"

function isEmptyMediaGridCell(cell: ProseMirrorNode): boolean {
  return isChooserMediaGridCell(cell)
}

/** Drop illegal empties: multi-empty only allowed in the first row. */
function normalizeMediaGridChildren(
  grid: ProseMirrorNode,
  cellType: ProseMirrorNode["type"],
): ProseMirrorNode[] | null {
  const cols = clampMediaColumns(grid.attrs.cols)
  const cells: ProseMirrorNode[] = []
  for (let i = 0; i < grid.childCount; i++) {
    cells.push(grid.child(i))
  }

  const first = cells.slice(0, cols)
  while (first.length < cols) {
    first.push(cellType.create())
  }
  const rest = cells.slice(cols)
  const firstFull = first.every((cell) => !isEmptyMediaGridCell(cell))
  const restFilled = rest.filter((cell) => !isEmptyMediaGridCell(cell))
  const restEmpty = rest.filter((cell) => isEmptyMediaGridCell(cell))

  const next = firstFull
    ? [...first, ...restFilled, ...(restEmpty.length > 0 ? [restEmpty[0]!] : [])]
    : [...first, ...restFilled]

  if (next.length === cells.length && next.every((cell, i) => cell === cells[i])) {
    return null
  }
  return next
}

function GridNodeView({ node, editor, getPos, selected }: NodeViewProps) {
  const columns = clampMediaColumns(node.attrs.cols)
  const [canAdd, setCanAdd] = useState(() => {
    const cells: ProseMirrorNode[] = []
    for (let i = 0; i < node.childCount; i++) cells.push(node.child(i))
    return canAddMediaGridElement(cells, columns)
  })

  useEffect(() => {
    const sync = () => {
      const position = getPos()
      if (typeof position !== "number") return
      const grid = editor.state.doc.nodeAt(position)
      if (!grid || grid.type.name !== "mediaGrid") return
      const cells: ProseMirrorNode[] = []
      for (let i = 0; i < grid.childCount; i++) cells.push(grid.child(i))
      setCanAdd(canAddMediaGridElement(cells, clampMediaColumns(grid.attrs.cols)))
    }
    sync()
    editor.on("transaction", sync)
    return () => {
      editor.off("transaction", sync)
    }
  }, [editor, getPos, node])

  function addCell() {
    if (!canAdd) return
    const position = getPos()
    if (typeof position !== "number") return
    editor
      .chain()
      .focus()
      .insertContentAt(position + node.nodeSize - 1, { type: "mediaGridCell" })
      .run()
  }

  function setColumns(value: number) {
    const position = getPos()
    if (typeof position !== "number") return
    const cols = clampMediaColumns(value)
    editor
      .chain()
      .focus()
      .command(({ tr, state }) => {
        const grid = tr.doc.nodeAt(position)
        if (!grid || grid.type.name !== "mediaGrid") return false
        const cellType = state.schema.nodes.mediaGridCell
        if (!cellType) return false

        const kept: ProseMirrorNode[] = []
        for (let i = 0; i < grid.childCount; i++) {
          kept.push(grid.child(i))
        }
        while (kept.length > 0 && isEmptyMediaGridCell(kept[kept.length - 1]!)) {
          kept.pop()
        }

        const target = gridChildCountForColumns(kept.length, cols)
        while (kept.length < target) {
          kept.push(cellType.create())
        }

        const next = grid.type.create({ ...grid.attrs, cols }, Fragment.from(kept), grid.marks)
        tr.replaceWith(position, position + grid.nodeSize, next)
        return true
      })
      .run()
  }

  return (
    <NodeViewWrapper className="seo-media-grid-node">
      <div className="seo-media-grid-toolbar mb-2 flex flex-wrap items-center gap-1 rounded border border-admin-border bg-admin-muted p-1">
        {[2, 3, 4].map((value) => (
          <button
            key={value}
            type="button"
            className={`rounded px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-fg/30 ${
              columns === value ? "bg-admin-fg text-white" : "text-admin-fg-muted hover:bg-white"
            }`}
            onClick={() => setColumns(value)}
          >
            {value} кол.
          </button>
        ))}
        <Button type="button" size="sm" variant="ghost" disabled={!canAdd} onClick={addCell}>
          <Plus className="h-3.5 w-3.5" aria-hidden />
          Элемент
        </Button>
        <span className="seo-media-grid-preview-hint ml-auto px-1 text-[11px] text-admin-fg-muted">
          На всю ширину блока
        </span>
      </div>
      <div className="seo-media-grid-preview" data-cols={columns}>
        <NodeViewContent
          className="seo-media-grid"
          data-cols={columns}
          data-selected={selected ? "1" : undefined}
        />
      </div>
    </NodeViewWrapper>
  )
}

const wrapKey = new PluginKey("mediaGridWrapOrphans")
const normalizeKey = new PluginKey("mediaGridNormalizeEmpties")

export const MediaGrid = Node.create({
  name: "mediaGrid",
  group: "block",
  content: "(mediaGridCell | image | video | paragraph)+",
  selectable: true,
  // Keep isolating:false so Enter/Backspace are not fenced like a table cell.
  // createGapCursor (via extendNodeSchema) still marks edges closed for Gapcursor —
  // otherwise needsGap() is false and caret cannot sit before/after the grid.
  isolating: false,

  // TipTap only copies known NodeSpec keys; createGapCursor must go through extendNodeSchema.
  extendNodeSchema(extension) {
    return extension.name === "mediaGrid" ? { createGapCursor: true } : {}
  },

  addAttributes() {
    return {
      cols: {
        default: 3,
        parseHTML: (element: Element) => clampMediaColumns(element.getAttribute("data-cols")),
        renderHTML: (attributes: { cols: number }) => ({ "data-cols": clampMediaColumns(attributes.cols) }),
      },
    }
  },

  parseHTML() {
    return [{ tag: "div.seo-media-grid" }]
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { class: "seo-media-grid" }), 0]
  },

  addNodeView() {
    return ReactNodeViewRenderer(GridNodeView)
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: wrapKey,
        appendTransaction: (_transactions, _oldState, newState) => {
          const cellType = newState.schema.nodes.mediaGridCell
          const gridType = newState.schema.nodes.mediaGrid
          if (!cellType || !gridType) return null

          let tr = newState.tr
          let mutated = false
          const ranges: { from: number; to: number; node: (typeof newState.doc)["firstChild"] }[] = []

          newState.doc.descendants((node, pos) => {
            if (node.type !== gridType) return
            node.forEach((child, offset) => {
              if (child.type !== cellType) {
                ranges.push({
                  from: pos + 1 + offset,
                  to: pos + 1 + offset + child.nodeSize,
                  node: child,
                })
              }
            })
          })

          for (let i = ranges.length - 1; i >= 0; i--) {
            const range = ranges[i]!
            if (!range.node) continue
            tr = tr.replaceWith(range.from, range.to, cellType.create(null, range.node))
            mutated = true
          }

          return mutated ? tr : null
        },
      }),
      new Plugin({
        key: normalizeKey,
        appendTransaction: (_transactions, _oldState, newState) => {
          const cellType = newState.schema.nodes.mediaGridCell
          const gridType = newState.schema.nodes.mediaGrid
          if (!cellType || !gridType) return null

          let tr = newState.tr
          let mutated = false
          const grids: { from: number; to: number; next: ProseMirrorNode }[] = []

          newState.doc.descendants((node, pos) => {
            if (node.type !== gridType) return
            const normalized = normalizeMediaGridChildren(node, cellType)
            if (!normalized) return
            grids.push({
              from: pos,
              to: pos + node.nodeSize,
              next: node.type.create({ ...node.attrs }, Fragment.from(normalized), node.marks),
            })
          })

          for (let i = grids.length - 1; i >= 0; i--) {
            const item = grids[i]!
            tr = tr.replaceWith(item.from, item.to, item.next)
            mutated = true
          }

          return mutated ? tr : null
        },
      }),
    ]
  },
})

export { MediaGridCell }
