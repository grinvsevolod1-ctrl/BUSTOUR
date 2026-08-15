/**
 * #24 TipTap table formatting: TableKit in RichEditor + CellRichEditor in resort builder.
 * Media grid stays separate (not TipTap tables); text formats allowed in grid text cells.
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { getSchema } from "@tiptap/core"
import { createRichEditorExtensions } from "@/components/admin/editor/shared-extensions"

const root = process.cwd()
const read = (rel: string) => readFileSync(join(root, rel), "utf8")

const pkg = JSON.parse(read("package.json")) as { dependencies: Record<string, string> }
assert.ok(pkg.dependencies["@tiptap/extension-table"], "depends on @tiptap/extension-table")

const schema = getSchema(createRichEditorExtensions())
for (const name of ["table", "tableRow", "tableCell", "tableHeader"] as const) {
  assert.ok(schema.nodes[name], `schema has ${name}`)
}

const shared = read("components/admin/editor/shared-extensions.ts")
assert.match(shared, /TableKit/, "RichEditor extensions include TableKit")
assert.match(shared, /@tiptap\/extension-table/, "imports table package")

const editor = read("components/admin/rich-editor.tsx")
assert.match(editor, /insertTable/, "toolbar can insert table")
assert.match(editor, /Таблица/, "table button labeled")

const slash = read("components/admin/editor/slash-command.tsx")
assert.match(slash, /insertTable/, "slash command inserts table")

const resortAdmin = read("components/admin/resort-table-builder.tsx")
assert.match(resortAdmin, /CellRichEditor/, "resort cells use CellRichEditor")
assert.doesNotMatch(
  resortAdmin,
  /<Textarea[\s\S]*updateCell/,
  "resort body cells are not plain Textarea",
)

const cellEditor = read("components/admin/cell-rich-editor.tsx")
assert.match(cellEditor, /toggleBold/, "cell editor supports bold")
assert.match(cellEditor, /toggleBulletList|toggleOrderedList/, "cell editor supports lists")
assert.doesNotMatch(cellEditor, /mediaGrid|TableKit|SeoImage/, "cell editor has no media/tables")

const publicResort = read("components/site/resort-comparison-table.tsx")
assert.match(publicResort, /dangerouslySetInnerHTML/, "public cells render HTML")
assert.match(publicResort, /stripHtml/, "mobile card titles strip HTML")

const css = read("app/globals.css")
assert.match(css, /seo-table/, "public/editor table styles")

const toolbarCtx = read("components/admin/editor/editor-toolbar-context.ts")
assert.match(toolbarCtx, /gridTextFormatsBlocked/, "media grid format constraints documented in code")

console.log("tiptap-table-fmt.selfcheck: ok")
