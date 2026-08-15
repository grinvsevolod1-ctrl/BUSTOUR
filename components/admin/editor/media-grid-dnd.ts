import type { Node as ProseMirrorNode } from "@tiptap/pm/model"
import { Fragment } from "@tiptap/pm/model"
import type { Transaction } from "@tiptap/pm/state"

export const MEDIA_GRID_CELL_MIME = "application/x-bustour-grid-cell"

/** Reorder a mediaGridCell inside its parent mediaGrid (before `toPos` cell). */
export function moveMediaGridCell(tr: Transaction, fromPos: number, toPos: number): boolean {
  if (fromPos === toPos) return false

  const fromNode = tr.doc.nodeAt(fromPos)
  const toNode = tr.doc.nodeAt(toPos)
  if (!fromNode || fromNode.type.name !== "mediaGridCell") return false
  if (!toNode || toNode.type.name !== "mediaGridCell") return false

  const $from = tr.doc.resolve(fromPos)
  const $to = tr.doc.resolve(toPos)
  if ($from.parent !== $to.parent) return false
  if ($from.parent.type.name !== "mediaGrid") return false

  const parent = $from.parent
  const parentPos = $from.before($from.depth)
  const fromIndex = $from.index()
  let toIndex = $to.index()

  const cells: ProseMirrorNode[] = []
  parent.forEach((child) => {
    cells.push(child)
  })

  const [moved] = cells.splice(fromIndex, 1)
  if (!moved) return false
  if (fromIndex < toIndex) toIndex -= 1
  cells.splice(toIndex, 0, moved)

  const next = parent.type.create(parent.attrs, Fragment.from(cells), parent.marks)
  tr.replaceWith(parentPos, parentPos + parent.nodeSize, next)
  return true
}
