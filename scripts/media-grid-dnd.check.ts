/**
 * Pure reorder helper for media grid DnD.
 * Run: npx tsx scripts/media-grid-dnd.check.ts
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const src = readFileSync(join(process.cwd(), "components/admin/editor/media-grid-dnd.ts"), "utf8")
assert.match(src, /export function moveMediaGridCell/)
assert.match(src, /MEDIA_GRID_CELL_MIME/)
assert.match(src, /mediaGridCell/)

const cell = readFileSync(
  join(process.cwd(), "components/admin/editor/media-grid-cell-extension.tsx"),
  "utf8",
)
assert.match(cell, /moveMediaGridCell/)
assert.match(cell, /handleDragStart/)
assert.match(cell, /handleDrop/)
assert.match(cell, /MEDIA_GRID_CELL_MIME/)
assert.doesNotMatch(cell, /useReactNodeView/)

console.log("media-grid-dnd checks passed")
