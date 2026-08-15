import type { Editor } from "@tiptap/react"

/** Selection is inside mediaGrid / mediaGridCell. */
export function selectionInMediaGrid(editor: Editor): boolean {
  const { $from } = editor.state.selection
  for (let depth = $from.depth; depth > 0; depth--) {
    const name = $from.node(depth).type.name
    if (name === "mediaGrid" || name === "mediaGridCell") return true
  }
  return false
}

/** Atom media selected — block toggles must not run (clearNodes crashes on image). */
export function selectionIsAtomMedia(editor: Editor): boolean {
  return editor.isActive("image") || editor.isActive("video") || editor.isActive("youtube")
}

/** Cursor is in a grid cell that holds text blocks (not chooser / not media-only). */
export function selectionInGridTextCell(editor: Editor): boolean {
  const { $from } = editor.state.selection
  for (let depth = $from.depth; depth > 0; depth--) {
    const node = $from.node(depth)
    if (node.type.name !== "mediaGridCell") continue
    if (node.childCount === 0) return false
    for (let i = 0; i < node.childCount; i++) {
      const name = node.child(i).type.name
      if (name !== "image" && name !== "video") return true
    }
    return false
  }
  return false
}

/** Nested media / HR / grid inserts — blocked inside any grid cell or on atom media. */
export function gridMediaInsertsBlocked(editor: Editor): boolean {
  return selectionInMediaGrid(editor) || selectionIsAtomMedia(editor)
}

/**
 * H2/H3/lists/quote — blocked on atom media and in media/chooser cells;
 * allowed in grid text cells and outside the grid.
 */
export function gridTextFormatsBlocked(editor: Editor): boolean {
  if (selectionIsAtomMedia(editor)) return true
  if (!selectionInMediaGrid(editor)) return false
  return !selectionInGridTextCell(editor)
}
