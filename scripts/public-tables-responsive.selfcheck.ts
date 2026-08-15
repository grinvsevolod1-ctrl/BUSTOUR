/**
 * #105: public tables matrix — dates / resort comparison / prose / transfer schedule patterns.
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const root = process.cwd()
const read = (rel: string) => readFileSync(join(root, rel), "utf8")

const dates = read("components/site/dates-table.tsx")
assert.match(dates, /hidden[\s\S]{0,80}lg:block/, "dates: desktop table from lg")
assert.match(dates, /lg:hidden/, "dates: mobile cards below lg")
assert.match(dates, /overflow-x-auto/, "dates: desktop scroll container")
assert.match(dates, /public-desktop-table/, "dates: desktop column separators")

const resort = read("components/site/resort-comparison-table.tsx")
assert.match(resort, /hidden[\s\S]{0,80}lg:block/, "resort: desktop table from lg")
assert.match(resort, /lg:hidden/, "resort: mobile cards below lg")
assert.match(resort, /overflow-x-auto/, "resort: desktop scroll container")
assert.match(resort, /public-desktop-table/, "resort: desktop column separators")

const css = read("app/globals.css")
assert.match(
  css,
  /\.prose-content[\s\S]{0,80}overflow-x:\s*auto/,
  "prose: overflow-x auto for wide tables",
)
assert.match(
  css,
  /\.prose-content table[\s\S]{0,400}border:\s*1px solid/,
  "prose: table cell borders",
)
assert.match(css, /white-space:\s*nowrap/, "prose: nowrap on table headers")
assert.match(css, /white-space:\s*normal/, "prose: wrap table body cells")
assert.match(
  css,
  /\.public-desktop-table[\s\S]{0,100}border-left:\s*1px solid var\(--color-line\)/,
  "component tables: shared vertical column separator",
)

const transfer = read("components/site/transfer-schedule-table.tsx")
assert.match(transfer, /hidden[\s\S]{0,40}lg:block/, "transfer: desktop from lg")
assert.match(transfer, /lg:hidden/, "transfer: mobile below lg")
assert.match(transfer, /public-desktop-table/, "transfer: desktop column separators")
assert.doesNotMatch(transfer, /priceOneWay|priceRoundTrip|formatMoney/, "transfer cards: no prices")

console.log("public-tables-responsive.selfcheck: ok")
