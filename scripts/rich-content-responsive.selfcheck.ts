import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8")

assert.match(css, /\.prose-content,\s*\n\.prose-editor\s*{[\s\S]*?overflow-wrap:\s*anywhere/, "rich content wraps long text")
assert.match(css, /\.prose-content \*,\s*\n\.prose-editor \*\s*{[\s\S]*?max-width:\s*100%/, "rich descendants are max-width guarded")
assert.match(
  css,
  /@media \(max-width: 950px\)[\s\S]*?\.prose-content \.seo-align-left,[\s\S]*?float:\s*none\s*!important[\s\S]*?width:\s*100%\s*!important/,
  "floats full-width under ~950px (beats inline width)",
)
assert.match(css, /\.prose-content table[\s\S]*?display:\s*table/, "tables use display:table for borders")
assert.match(css, /\.prose-content[\s\S]*?overflow-x:\s*auto/, "prose scrolls wide tables")
assert.match(
  css,
  /\.prose-content table(?:\.seo-table)? th,[\s\S]*?white-space:\s*nowrap/,
  "table headers nowrap",
)
assert.match(
  css,
  /\.prose-content table(?:\.seo-table)? td,[\s\S]*?white-space:\s*normal/,
  "table cells wrap on narrow viewports",
)
assert.match(css, /\.prose-content iframe,[\s\S]*?width:\s*100%/, "iframes stay fluid")

const listRule = css.match(
  /\.prose-content ul,\s*\r?\n\.prose-editor ul,\s*\r?\n\.prose-content ol,\s*\r?\n\.prose-editor ol\s*\{([^}]+)\}/,
)
assert.ok(listRule, "prose ul/ol rule present")
assert.match(listRule[1], /padding-left:\s*1\.25rem/, "lists use moderate padding")
assert.match(listRule[1], /display:\s*block/, "lists stay block (wrap under floats)")
assert.doesNotMatch(
  listRule[1],
  /display:\s*flow-root|overflow:\s*(?:hidden|clip)|display:\s*table/,
  "lists not BFC-isolated",
)

assert.match(css, /\.prose-content ul,[\s\S]*?list-style-position:\s*outside/, "list markers outside (even text edge)")
assert.match(
  css,
  /\.prose-content \.seo-align-left,[\s\S]*?margin:\s*0\.5em 1\.25rem 0\.5em 0/,
  "floated left media keep right gap",
)

console.log("rich-content-responsive.selfcheck: ok")
