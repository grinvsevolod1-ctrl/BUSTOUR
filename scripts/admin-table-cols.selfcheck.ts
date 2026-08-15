/**
 * Admin list/editor tables: cell borders + hug action cols. No column drag-resize
 * (that wrongly resized admin chrome; public site widths are separate).
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const root = process.cwd()
const read = (p: string) => readFileSync(join(root, p), "utf8")

const ui = read("components/admin/ui.tsx")
assert.ok(ui.includes("border-collapse"), "TableWrap: border-collapse")
assert.ok(ui.includes("actions?: boolean"), "Th/Td actions prop")
assert.ok(ui.includes("w-0 whitespace-nowrap"), "actions hug width")
assert.ok(ui.includes('width: "1%"'), "actions width 1%")
assert.doesNotMatch(ui, /ColResizeHandle|table-resize|TableResizeProvider/)

const transfer = read("components/admin/transfer-schedule-editor.tsx")
assert.ok(transfer.includes("TableWrap"), "transfer schedule uses TableWrap")
assert.ok(transfer.includes("actions"), "transfer schedule hug actions")
assert.doesNotMatch(transfer, /серая ручка/)

const sortable = read("components/admin/reorder/sortable-collections.tsx")
assert.ok(!sortable.includes("divide-y divide-admin-border"), "sortable body: no divide-y")

const samples = [
  "app/admin/(protected)/transfers/page.tsx",
  "app/admin/(protected)/countries/page.tsx",
  "components/admin/dictionary-tabs-table.tsx",
  "components/admin/tour-pricing-workspace.tsx",
  "components/admin/resort-table-builder.tsx",
]
for (const p of samples) {
  const src = read(p)
  assert.ok(src.includes("actions"), `${p}: actions hug`)
}

console.log("ok")
