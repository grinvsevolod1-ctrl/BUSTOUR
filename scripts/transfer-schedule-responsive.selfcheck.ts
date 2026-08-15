/**
 * #104: transfer schedule — desktop cell borders + min-widths; mobile cards without prices
 * (prices stay in the page price block above the schedule).
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const src = readFileSync(join(process.cwd(), "components/site/transfer-schedule-table.tsx"), "utf8")
const page = readFileSync(join(process.cwd(), "app/(site)/info/transfers/[slug]/page.tsx"), "utf8")

assert.match(src, /hidden[\s\S]{0,40}lg:block/, "desktop table from lg")
assert.match(src, /lg:hidden/, "mobile cards below lg")
assert.match(src, /colgroup/, "desktop table uses colgroup width control")
assert.match(src, /publicColStyle/, "column widths use shared publicColStyle contract")
assert.match(src, /data-col-mode=/, "column width mode exposed for debugging/tests")
assert.match(src, /data-col-id=/, "each column has id attribute on th/col")
assert.match(src, /resolveTransferScheduleColWidths/, "transfer schedule uses the shared column widths resolver")
assert.match(src, /border-line/, "visible cell borders")
assert.match(src, /Отправление/, "departure label on card")
assert.match(src, /Прибытие/, "arrival label on card")
assert.match(src, /Забронировать|Бронировать/, "book CTA on card")
assert.match(src, /requireEmail=\{false\}/, "transfer booking skips email")
assert.match(src, /grid-cols-2/, "dep/arr two-column grid on mobile card")

assert.doesNotMatch(src, /priceOneWay|priceRoundTrip|formatMoney|В одну сторону/, "card has no price props/UI")
assert.doesNotMatch(
  page,
  /TransferScheduleTable[\s\S]{0,200}priceOneWay|TransferScheduleTable[\s\S]{0,200}priceRoundTrip/,
  "page does not pass prices into schedule table",
)

console.log("transfer-schedule-responsive.selfcheck: ok")
