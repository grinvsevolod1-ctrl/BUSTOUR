import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import {
  ALL_PERIODS_LABEL,
  collectPeriodLabels,
  isUpcomingDeparture,
  minTablePrice,
  tourMatchesDepartureRangeSelection,
  tourMatchesPeriod,
  upcomingRows,
} from "@/lib/dates-table"
import type { DatesTable } from "@/lib/types"

const today = "2026-07-22"

const table: DatesTable = {
  note: "",
  noteType: "info",
  currency: "BYN",
  footnotes: [],
  rows: [
    {
      startDate: "2025-01-10",
      endDate: "2025-01-15",
      description: "past",
      tags: [],
      rooms: [{ name: "A", price: 100, discount: 0 }],
    },
    {
      startDate: "2026-08-01",
      endDate: "2026-08-07",
      description: "future",
      tags: [],
      rooms: [{ name: "A", price: 200, discount: 0 }],
    },
    {
      startDate: "2026-09-10",
      endDate: "2026-09-16",
      description: "later",
      tags: [],
      rooms: [{ name: "B", price: 150, discount: 0 }],
    },
  ],
}

assert.equal(isUpcomingDeparture("2026-07-22", today), true)
assert.equal(isUpcomingDeparture("2026-07-21", today), false)
assert.equal(upcomingRows(table.rows, today).length, 2)
assert.equal(minTablePrice(table, today), 150)
assert.deepEqual(collectPeriodLabels([table], today), ["01.08 - 07.08.2026", "10.09 - 16.09.2026"])
assert.equal(tourMatchesPeriod(table, ALL_PERIODS_LABEL, today), true)
assert.equal(tourMatchesPeriod(table, "01.08 - 07.08.2026", today), true)
assert.equal(tourMatchesPeriod(table, "10.01 - 15.01.2025", today), false)
assert.equal(tourMatchesDepartureRangeSelection(table, { kind: "custom", start: "2026-08-16", end: "2026-08-31" }, today), false)
assert.equal(tourMatchesDepartureRangeSelection(table, { kind: "custom", start: "2026-09-01", end: "2026-09-30" }, today), true)
assert.equal(tourMatchesDepartureRangeSelection(table, { kind: "custom", start: "2026-09-01", end: "" }, today), true)

const listing = readFileSync("components/site/tours-listing.tsx", "utf8")
assert.match(listing, /DateRangePicker/, "bus filter must use shared DateRangePicker")
assert.match(listing, /dateFrom/, "dateFrom must be synced to URL")
assert.match(listing, /dateTo/, "dateTo must be synced to URL")
assert.doesNotMatch(listing, /По декадам|По половинам|decadeLabel|halfLabel/, "old decade/half picker UI must stay removed")

const picker = readFileSync("components/ui/date-range-picker.tsx", "utf8")
assert.match(picker, /from "flatpickr"/, "period picker must use Flatpickr")
assert.match(picker, /mode: "range"/, "Flatpickr must use range mode")
assert.match(picker, /showMonths: 1/, "period picker must show exactly one calendar screen")
assert.match(picker, /dateFormat: "d\.m\.Y"/, "input must use dd.mm.yyyy dates")
assert.match(picker, /rangeSeparator: " - "/, "range input must use ` - ` separator")
assert.match(picker, /formatDateRangePickerLabel/, "period input label must be formatted by helper")
assert.match(picker, /start\.slice\(6\) === end\.slice\(6\)/, "same-year period range must be compacted")
assert.doesNotMatch(picker, /CalendarIcon/, "period input must not show leading calendar icon")
assert.match(picker, /Russian/, "Flatpickr must use Russian locale")
assert.match(picker, /minDate/, "past dates must be disabled via minDate")
assert.match(picker, /monthSelectorType: "dropdown"/, "month dropdown must stay enabled")
assert.doesNotMatch(picker, /react-day-picker|DayPicker|PopoverContent|numberOfMonths/, "period picker must not use the old custom DayPicker popover")

assert.doesNotMatch(listing, /\* Цена указана за 1 человека/, "price filter must not show the outside person-price note")
assert.match(listing, /document\.addEventListener\("pointerdown", onPointerDown\)/, "price dropdown must close on outside pointerdown")

const css = readFileSync("app/globals.css", "utf8")
assert.match(css, /flatpickr\/dist\/flatpickr\.css/, "Flatpickr base CSS must be imported")
assert.match(css, /\.flatpickr-day\.startRange/, "start range day must be styled")
assert.match(css, /\.flatpickr-day\.endRange/, "end range day must be styled")
assert.match(css, /\.flatpickr-day\.inRange/, "middle range days must be styled")
assert.match(css, /#4a90e2/i, "range endpoints must use blue highlight")
assert.match(css, /#efefef/i, "range middle must use light gray fill")

console.log("departure-period.selfcheck: ok")
