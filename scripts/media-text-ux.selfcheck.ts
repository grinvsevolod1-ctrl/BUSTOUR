/**
 * Media grid cells: chooser card, text/media fill, drag; toolbar guards.
 * Run: npx tsx scripts/media-text-ux.selfcheck.ts
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import {
  canAddMediaGridElement,
  emptyGridRow,
  gridChildCountForColumns,
  gridTrailingSlots,
} from "../components/admin/editor/media-helpers"

assert.equal(gridTrailingSlots(0, 3), 3)
assert.equal(gridTrailingSlots(1, 3), 2)
assert.equal(gridTrailingSlots(2, 3), 1)
assert.equal(gridTrailingSlots(3, 3), 0)
assert.equal(gridTrailingSlots(4, 3), 0)

assert.equal(gridChildCountForColumns(0, 2), 2)
assert.equal(gridChildCountForColumns(0, 4), 4)
assert.equal(gridChildCountForColumns(3, 2), 3)
assert.equal(gridChildCountForColumns(3, 4), 4)
assert.equal(gridChildCountForColumns(2, 2), 2)

const empty = { type: { name: "mediaGridCell" }, childCount: 0 }
const filled = { type: { name: "mediaGridCell" }, childCount: 1 }
assert.equal(canAddMediaGridElement([empty, empty], 2), false)
assert.equal(canAddMediaGridElement([filled, empty], 2), false)
assert.equal(canAddMediaGridElement([filled, filled], 2), true)
assert.equal(canAddMediaGridElement([filled, filled, empty], 2), false)

const row = emptyGridRow(3)
assert.equal(row.length, 3)
assert.ok(row.every((cell) => cell.type === "mediaGridCell"))

const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8")
assert.match(css, /Пишите текст/)
assert.match(css, /prose-content \.seo-media-grid-cell \{[^}]*background:\s*transparent/s)
assert.match(css, /prose-editor \.seo-media-grid-cell \{[^}]*background:\s*var\(--color-cream/s)
/* Public + admin share the same track formula; TipTap host carries columns */
assert.match(css, /\.prose-content \.seo-media-grid\[data-cols="2"\]/)
assert.match(css, /\.prose-content \.seo-media-grid\[data-cols="3"\]/)
assert.match(css, /\.prose-content \.seo-media-grid\[data-cols="4"\]/)
assert.match(css, /seo-media-grid\[data-cols="2"\] \[data-node-view-content-react\]/)
assert.match(css, /seo-media-grid\[data-cols="3"\] \[data-node-view-content-react\]/)
assert.match(css, /seo-media-grid\[data-cols="4"\] \[data-node-view-content-react\]/)
assert.match(css, /seo-media-grid-preview\[data-cols="3"\] \.seo-media-grid \[data-node-view-content-react\]/)
assert.match(css, /repeat\(2, minmax\(0, 1fr\)\)/)
assert.match(css, /repeat\(3, minmax\(0, 1fr\)\)/)
assert.match(css, /repeat\(4, minmax\(0, 1fr\)\)/)
assert.match(css, /seo-media-grid-preview/)
assert.match(css, /seo-media-grid-preview[^{]*\{[^}]*width:\s*100%/s)
assert.match(css, /seo-media-grid-preview > \.seo-media-grid\[data-node-view-content\][^{]*\{[^}]*display:\s*block\s*!important/s)
assert.match(css, /seo-media-grid \[data-node-view-content-react\][^{]*\{[^}]*display:\s*grid\s*!important/s)
assert.doesNotMatch(css, /grid-template-columns:\s*subgrid/)
assert.doesNotMatch(css, /min-width:\s*42rem/)
assert.doesNotMatch(css, /seo-media-grid-slot/)
assert.doesNotMatch(css, /seo-media-grid-preview\[data-cols="4"\] \[data-node-view-content-react\] > \.react-renderer/)
assert.match(css, /seo-media-grid-remove/)

const views = readFileSync(
  join(process.cwd(), "components/admin/editor/media-node-views.tsx"),
  "utf8",
)
assert.doesNotMatch(views, /Текст сверху/)
assert.doesNotMatch(views, /media-insert/)

const grid = readFileSync(
  join(process.cwd(), "components/admin/editor/media-grid-extension.tsx"),
  "utf8",
)
assert.match(grid, /mediaGridCell/)
assert.match(grid, /Элемент/)
assert.match(grid, /addCell/)
assert.match(grid, /canAddMediaGridElement/)
assert.match(grid, /disabled=\{!canAdd\}/)
assert.match(grid, /normalizeMediaGridChildren/)
assert.match(grid, /setColumns/)
assert.match(grid, /gridChildCountForColumns/)
assert.match(grid, /seo-media-grid-preview/)
assert.match(grid, /На всю ширину блока/)
assert.match(grid, /createGapCursor:\s*true/)
assert.match(grid, /extendNodeSchema/)
assert.doesNotMatch(grid, /ширина текста на сайте/)
assert.doesNotMatch(grid, /Ряд/)
assert.doesNotMatch(grid, /seo-media-grid-slot/)
assert.doesNotMatch(grid, />Медиа</)

const cell = readFileSync(
  join(process.cwd(), "components/admin/editor/media-grid-cell-extension.tsx"),
  "utf8",
)
assert.match(cell, /seo-media-grid-chooser/)
assert.match(cell, /seo-media-grid-cell-chrome/)
assert.match(cell, /seo-media-grid-cell-chrome-spacer/)
assert.match(cell, /Медиа/)
assert.match(cell, /Текст/)
assert.match(cell, /data-drag-handle/)
assert.match(cell, /handleDragStart/)
assert.match(cell, /moveMediaGridCell/)
assert.match(cell, /seo-media-grid-clear/)
assert.match(cell, /seo-media-grid-clear--media/)
assert.match(cell, /seo-media-grid-remove/)
assert.match(cell, /removeCell/)
assert.match(cell, /canRemoveCell/)
assert.match(cell, /Never both X|inFirstRow \?/)
assert.match(cell, /clearCell/)
assert.match(cell, /selectionUpdate/)

assert.match(css, /seo-media-grid-cell-chrome/)
assert.match(css, /data-cell-kind="media"[^{]*\{[^}]*background:\s*transparent/s)
assert.doesNotMatch(css, /data-cell-kind="media"[^{]*\{[^}]*aspect-ratio:\s*4\s*\/\s*3/s)
assert.match(css, /seo-media-grid-clear--media/)
assert.match(css, /min-height:\s*2\.75rem/)
assert.match(css, /seo-media-grid-preview/)
assert.match(css, /seo-media-grid-preview\[data-cols="3"\]/)
assert.match(css, /display:\s*grid\s*!important/)
assert.doesNotMatch(css, /subgrid/)
assert.doesNotMatch(css, /min-width:\s*42rem/)
assert.doesNotMatch(css, /flex:\s*0 0 calc\(\(100%/)

const toolbarCtx = readFileSync(
  join(process.cwd(), "components/admin/editor/editor-toolbar-context.ts"),
  "utf8",
)
assert.match(toolbarCtx, /gridMediaInsertsBlocked/)
assert.match(toolbarCtx, /gridTextFormatsBlocked/)
assert.match(toolbarCtx, /selectionInGridTextCell/)
assert.match(toolbarCtx, /mediaGridCell/)

const editor = readFileSync(join(process.cwd(), "components/admin/rich-editor.tsx"), "utf8")
assert.match(editor, /emptyGridRow/)
assert.match(editor, /MediaGridCell|createRichEditorExtensions/)
assert.match(editor, /gridMediaInsertsBlocked/)
assert.match(editor, /gridTextFormatsBlocked/)
assert.match(editor, /disabled=\{textFormatsOff\}|textFormatsOff/)
assert.match(editor, /disabled=\{mediaInsertsOff\}|mediaInsertsOff/)
assert.match(editor, /Редактор 2/)

assert.match(cell, /paragraph \| heading \| blockquote \| bulletList \| orderedList \| image \| video/)

console.log("rich-editor media text UX checks passed")
