/**
 * Transfer schedule: desktop table from lg; mobile/tablet cards below lg
 * so «Бронировать» is visible without horizontal table scroll @320.
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const src = readFileSync(join(process.cwd(), "components/site/transfer-schedule-table.tsx"), "utf8")

assert.match(src, /"use client"/, "client for collapse state")
assert.match(src, /COLLAPSED_ROWS\s*=\s*3/, "collapse after 3 rows")

assert.match(src, /hidden[\s\S]{0,120}lg:block/, "desktop table from lg")
assert.match(src, /lg:hidden/, "mobile/tablet card layout")
assert.match(src, /grid grid-cols-2/, "cards use 2-col dep/arr layout")
assert.match(src, /Отправление|Прибытие/, "card labels match table headers")
assert.match(src, /Примечание|row\.note/, "note field on cards or table")
assert.match(src, /Забронировать|Бронировать/, "booking CTA on cards")
assert.match(src, /ModalTourOrder/, "booking opens tour-order modal")
assert.match(src, /type="button"/, "booking CTA is a button, not a bare link")
assert.doesNotMatch(src, /href=\{row\.bookingHref/, "booking CTA must not navigate via bookingHref")
assert.doesNotMatch(src, /defaultBookingHref\s*=\s*"\/contacts"/, "must not default-navigate to /contacts")
assert.doesNotMatch(
  src,
  /lg:hidden[\s\S]{0,400}overflow-x-auto/,
  "mobile cards must not sit inside horizontal scroll wrap",
)
assert.match(src, /border-line/, "cards use soft line border")
assert.doesNotMatch(
  src,
  /lg:hidden[\s\S]{0,200}border-brand/,
  "mobile card stack must not use sharp brand frame like desktop table",
)

console.log("transfer-schedule-table.selfcheck: ok")
