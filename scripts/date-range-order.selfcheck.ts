/**
 * Self-check: arrival (endDate) >= departure (startDate).
 * Run: npx tsx scripts/date-range-order.selfcheck.ts
 */
import assert from "node:assert/strict"
import {
  dateRangeOrderError,
  datesTableRangeError,
  isDateRangeOrdered,
  emptyDatesTable,
} from "@/lib/dates-table"

assert.equal(isDateRangeOrdered("2026-08-01", "2026-08-07"), true)
assert.equal(isDateRangeOrdered("2026-08-01", "2026-08-01"), true)
assert.equal(isDateRangeOrdered("2026-08-07", "2026-08-01"), false)
assert.equal(dateRangeOrderError("2026-08-07", "2026-08-01", "Выезд 1"), "Выезд 1: дата прибытия (2026-08-01) не может быть раньше даты отправления (2026-08-07)")
assert.equal(dateRangeOrderError("2026-08-01", "2026-08-07"), null)

const bad = {
  ...emptyDatesTable,
  rows: [{ startDate: "2026-09-10", endDate: "2026-09-01", description: "", tags: [], rooms: [] }],
}
assert.match(datesTableRangeError(bad) ?? "", /Выезд 1/)

const good = {
  ...emptyDatesTable,
  rows: [{ startDate: "2026-09-01", endDate: "2026-09-10", description: "", tags: [], rooms: [] }],
}
assert.equal(datesTableRangeError(good), null)

console.log("date-range-order.selfcheck: ok")
