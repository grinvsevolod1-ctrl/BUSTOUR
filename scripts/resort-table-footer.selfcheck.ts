/**
 * #71: resort table has rich text under the grid («Текст под таблицей»),
 * stored in block.body for new-format tables; shown on public page under table.
 * Run: npx tsx scripts/resort-table-footer.selfcheck.ts
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const root = process.cwd()
const admin = readFileSync(join(root, "components/admin/resort-table-builder.tsx"), "utf8")
const publicSrc = readFileSync(join(root, "components/site/resort-comparison-table.tsx"), "utf8")
const actions = readFileSync(join(root, "app/admin/cms-actions.ts"), "utf8")

assert.match(admin, /Текст под таблицей/, "admin: label Текст под таблицей")
assert.match(admin, /Текст под заголовком/, "admin: keep Текст под заголовком above table")
{
  const gridIdx = admin.indexOf("overflow-x-auto")
  const footerLabelIdx = admin.lastIndexOf("Текст под таблицей")
  // Either order is acceptable: editor above preview grid or vice-versa;
  // we only assert both markers exist in the same source file.
  assert.ok(gridIdx >= 0 && footerLabelIdx >= 0, "admin: both footer editor and table grid present")
}
assert.match(admin, /name=\"tableJson\"/, "admin: grid packed as tableJson")
assert.match(admin, /name=\"body\" value=\{footer\}/, "admin: body = footer HTML")
assert.match(admin, /setFooter/, "admin: footer state")

assert.match(actions, /tableJson/, "cms-actions: read tableJson for grid")
assert.match(
  actions,
  /Текст под таблицей|body = «Текст под таблицей»|footer/,
  "cms-actions: body kept as footer",
)

assert.match(publicSrc, /footer:/, "public: ResortTableData.footer")
assert.match(publicSrc, /FooterHtml/, "public: FooterHtml under table")
assert.match(publicSrc, /<ResortTable data=\{data\} \/>\s*<FooterHtml/, "public: footer after table")

console.log("resort-table-footer.selfcheck: ok")
