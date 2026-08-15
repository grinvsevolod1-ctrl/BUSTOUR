import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import {
  coerceDatesTable,
  DEFAULT_DATES_FOOTNOTES,
  formatDatesFootnotes,
} from "@/lib/dates-table"

const root = process.cwd()
function read(rel: string) {
  return fs.readFileSync(path.join(root, rel), "utf8")
}

const legacy = coerceDatesTable({ note: "", noteType: "info", currency: "EUR", rows: [] })
assert.deepEqual(legacy.footnotes, [...DEFAULT_DATES_FOOTNOTES])
assert.deepEqual(formatDatesFootnotes(legacy), [
  "* Цены указаны в EUR на 1 человека.",
  "** Скидка действует при бронировании выбранной категории номера.",
])

const empty = coerceDatesTable({ note: "", noteType: "info", currency: "BYN", footnotes: [], rows: [] })
assert.deepEqual(formatDatesFootnotes(empty), [])

const custom = coerceDatesTable({
  note: "",
  noteType: "info",
  currency: "USD",
  footnotes: ["* Price in {currency}", "", "  ** Extra  "],
  rows: [],
})
assert.deepEqual(formatDatesFootnotes(custom), ["* Price in USD", "** Extra"])

const site = read("components/site/dates-table.tsx")
assert.ok(site.includes("formatDatesFootnotes"))
assert.ok(site.includes('data-dates-footnotes={placement}'))
assert.ok(site.includes('placement="desktop"'))
assert.ok(site.includes('placement="card"'))
assert.ok(site.includes("hidden") && site.includes("lg:block"))
assert.ok(!site.includes("Цены указаны в"), "no hardcoded price footnote in dates-table.tsx")
assert.ok(!site.includes("Скидка действует"), "no hardcoded discount footnote in dates-table.tsx")

const editor = read("components/admin/tour-pricing-editor.tsx")
assert.ok(editor.includes("Добавить сноску"))
assert.ok(editor.includes("Удалить сноску"))
assert.ok(editor.includes("data-dates-footnotes-editor"))
assert.ok(editor.includes("footnotes"))

console.log("dates-footnotes.selfcheck: ok")
