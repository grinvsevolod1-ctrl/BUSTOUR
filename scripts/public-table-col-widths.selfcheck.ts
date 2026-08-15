/**
 * Public table column widths (site-facing). Admin CRUD tables must NOT resize.
 * Run: npx tsx scripts/public-table-col-widths.selfcheck.ts
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import {
  DEFAULT_TRANSFER_SCHEDULE_COL_WIDTHS,
  parsePublicColWidths,
  publicColStyle,
  resolveTransferScheduleColWidths,
  serializePublicColWidths,
  type PublicColWidth,
} from "../lib/public-table-col-widths"

const root = process.cwd()
const read = (p: string) => readFileSync(join(root, p), "utf8")

// --- pure helpers ---
assert.deepEqual(parsePublicColWidths(""), {})
assert.deepEqual(parsePublicColWidths("not-json"), {})
const sample: Record<string, PublicColWidth> = {
  departure: { mode: "hug", minPx: 112 },
  note: { mode: "fill", minPx: 192 },
  booking: { mode: "fixed", widthPx: 140, minPx: 120, maxPx: 160 },
}
const roundTrip = parsePublicColWidths(serializePublicColWidths(sample))
assert.equal(roundTrip.departure?.mode, "hug")
assert.equal(roundTrip.note?.mode, "fill")
assert.equal(roundTrip.booking?.widthPx, 140)

const hug = publicColStyle({ mode: "hug", minPx: 100 })
// hug must NOT set width=minPx — that ignores cell/button padding and overflows
assert.equal(hug.width, "1%")
assert.equal(hug.whiteSpace, "nowrap")
assert.equal(hug.minWidth, 100)

const hugBare = publicColStyle({ mode: "hug" })
assert.equal(hugBare.width, "1%")

const fill = publicColStyle({ mode: "fill", minPx: 180, maxPx: 400 })
assert.equal(fill.width, "auto")
assert.equal(fill.minWidth, 180)
assert.equal(fill.maxWidth, 400)

const fixed = publicColStyle({ mode: "fixed", widthPx: 120 })
assert.equal(fixed.width, 120)

// Defaults: content cols fill, booking (actions) hug — no tight px width on booking
assert.equal(DEFAULT_TRANSFER_SCHEDULE_COL_WIDTHS.departure.mode, "fill")
assert.equal(DEFAULT_TRANSFER_SCHEDULE_COL_WIDTHS.arrival.mode, "fill")
assert.equal(DEFAULT_TRANSFER_SCHEDULE_COL_WIDTHS.note.mode, "fill")
assert.equal(DEFAULT_TRANSFER_SCHEDULE_COL_WIDTHS.booking.mode, "hug")
assert.equal(DEFAULT_TRANSFER_SCHEDULE_COL_WIDTHS.booking.minPx, undefined)

// Legacy hug/hug/fill/hug auto-save must resolve to new fill defaults
const legacy = serializePublicColWidths({
  departure: { mode: "hug", minPx: 112 },
  arrival: { mode: "hug", minPx: 112 },
  note: { mode: "fill", minPx: 192 },
  booking: { mode: "hug", minPx: 136 },
})
const migrated = resolveTransferScheduleColWidths(legacy)
assert.equal(migrated.departure.mode, "fill")
assert.equal(migrated.booking.mode, "hug")
assert.equal(migrated.booking.minPx, undefined)

// Intentional custom hug on one col is kept
const custom = resolveTransferScheduleColWidths(
  serializePublicColWidths({
    departure: { mode: "hug", minPx: 120 },
    arrival: { mode: "fill", minPx: 112 },
    note: { mode: "fill", minPx: 192 },
    booking: { mode: "hug", minPx: 136 },
  }),
)
assert.equal(custom.departure.mode, "hug")
assert.equal(custom.departure.minPx, 120)

// Auto layout: hug sizes to content+padding; table-fixed + width:px crushed the CTA
const pub = read("components/site/transfer-schedule-table.tsx")
assert.doesNotMatch(pub, /\btable-fixed\b/, "auto layout so hug includes padding")
assert.match(pub, /colgroup/, "colgroup applies column widths reliably")
assert.match(pub, /data-col-mode/, "mode visible in DOM for QA")
assert.match(pub, /publicColStyle|colWidths/)

// --- admin tables: resize OFF ---
const ui = read("components/admin/ui.tsx")
assert.doesNotMatch(ui, /ColResizeHandle/, "admin Th must not mount resize handles")
assert.doesNotMatch(ui, /TableResizeProvider/, "admin TableWrap must not wire resize provider")
assert.match(ui, /actions/, "keep hug actions cols")
assert.ok(!ui.includes("table-resize"), "ui.tsx must not import table-resize")

const keys = read("lib/transfer-display.ts")
assert.match(keys, /colWidths/)

const editor = read("components/admin/transfer-schedule-editor.tsx")
assert.match(editor, /PublicTableColHeader|colWidths|Ширин/)
assert.doesNotMatch(editor, /серая ручка/, "no admin-local resize hint")

// Menu must escape table overflow (createPortal + fixed), else clipped in narrow cols
const header = read("components/admin/public-table-col-header.tsx")
assert.match(header, /createPortal/, "col menu portals out of overflow:auto table")
assert.match(header, /className="fixed z-50/, "menu uses fixed viewport coords")
assert.match(header, /getBoundingClientRect/, "positions menu from button rect")
assert.doesNotMatch(
  header,
  /absolute left-0 top-full/,
  "menu must not be absolute inside th (clipped)",
)

console.log("public-table-col-widths.selfcheck: ok")
