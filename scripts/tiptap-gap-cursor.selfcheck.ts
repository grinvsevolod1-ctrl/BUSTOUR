/**
 * Gapcursor around mediaGrid (#25).
 * Run: npx tsx scripts/tiptap-gap-cursor.selfcheck.ts
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { getSchema } from "@tiptap/core"
import { Node } from "@tiptap/pm/model"
import { GapCursor } from "@tiptap/pm/gapcursor"
import { createRichEditorExtensions } from "../components/admin/editor/shared-extensions"
import { emptyGridRow } from "../components/admin/editor/media-helpers"

const gridSrc = readFileSync(
  join(process.cwd(), "components/admin/editor/media-grid-extension.tsx"),
  "utf8",
)
assert.match(gridSrc, /isolating:\s*false/)
assert.match(gridSrc, /createGapCursor:\s*true/)
assert.match(gridSrc, /extendNodeSchema/)

const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8")
assert.match(
  css,
  /prose-editor \.ProseMirror-focused \.ProseMirror-gapcursor \{[^}]*display:\s*block/s,
)

const schema = getSchema(createRichEditorExtensions())
const mediaGrid = schema.nodes.mediaGrid
assert.ok(mediaGrid, "mediaGrid in schema")
assert.equal(mediaGrid.spec.isolating, false)
assert.equal(mediaGrid.spec.createGapCursor, true)

const doc = Node.fromJSON(schema, {
  type: "doc",
  content: [
    {
      type: "mediaGrid",
      attrs: { cols: 2 },
      content: emptyGridRow(2),
    },
  ],
})

assert.equal(GapCursor.valid(doc.resolve(0)), true, "gap before mediaGrid")
assert.equal(GapCursor.valid(doc.resolve(doc.content.size)), true, "gap after mediaGrid")

const withPara = Node.fromJSON(schema, {
  type: "doc",
  content: [
    { type: "paragraph" },
    {
      type: "mediaGrid",
      attrs: { cols: 2 },
      content: emptyGridRow(2),
    },
  ],
})
assert.equal(withPara.firstChild?.type.name, "paragraph")
assert.equal(withPara.child(1)?.type.name, "mediaGrid")
assert.equal(
  GapCursor.valid(withPara.resolve(withPara.content.size)),
  true,
  "gap after mediaGrid when paragraph precedes",
)

console.log("tiptap-gap-cursor.selfcheck: ok")
