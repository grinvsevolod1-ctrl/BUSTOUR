/**
 * Dates table section only when there are rows (note-only ≠ ghost empty table).
 * Run: npx tsx scripts/tour-dates-ghost.selfcheck.ts
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { emptyDatesTable, hasDatesTable } from "../lib/dates-table"

assert.equal(hasDatesTable(emptyDatesTable), false)
assert.equal(hasDatesTable({ ...emptyDatesTable, note: "Только примечание" }), false, "note alone is not a table")
assert.equal(
  hasDatesTable({
    ...emptyDatesTable,
    rows: [
      {
        startDate: "2026-08-01",
        endDate: "2026-08-05",
        description: "",
        tags: [],
        rooms: [],
      },
    ],
  }),
  true,
)

const page = readFileSync(join(process.cwd(), "components/site/tour-page-content.tsx"), "utf8")
assert.match(page, /hasDatesTable\(tour\.datesTable\)/)

console.log("tour-dates-ghost.selfcheck: ok")
