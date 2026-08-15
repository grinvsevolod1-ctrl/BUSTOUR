import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { parsePublicColWidths, publicColStyle, resolveTableColWidths } from "../lib/public-table-col-widths"

const root = process.cwd()
const admin = readFileSync(join(root, "components/admin/resort-table-builder.tsx"), "utf8")
const actions = readFileSync(join(root, "app/admin/cms-actions.ts"), "utf8")
const publicSrc = readFileSync(
  join(root, "components/site/resort-comparison-table.tsx"),
  "utf8",
)
const editorSrc = readFileSync(
  join(root, "components/admin/public-table-col-header.tsx"),
  "utf8",
)

assert.match(admin, /PublicTableColHeader/, "admin exposes per-column settings")
assert.match(admin, /JSON\.stringify\(\{ columns, rows, colWidths \}\)/, "admin submits widths")
assert.match(actions, /extra\.colWidths = parsed\.colWidths/, "action stores widths in extra")
assert.match(publicSrc, /<col key=\{i\} style=\{publicColStyle/, "desktop table applies widths")

// — UI conditional fields — editor exposes per-mode controls —
// Fixed mode has a dedicated width input labeled with "Ширина, px"
assert.match(editorSrc, /value\.mode === "fixed"/, "editor has a conditional branch for fixed mode")
assert.match(editorSrc, /Ширина, px/, "editor exposes a width input (fixed mode)")
assert.match(editorSrc, /grid grid-cols-2 gap-2.*Min, px/s, "editor renders a Min input inside a 2-col grid (hug/fill)")
// Max input is explicitly conditionally rendered — skipped when hug
assert.match(editorSrc, /value\.mode !== "hug"/, "editor hides Max input when mode is hug")

// — Core sanitize — parse drops fields irrelevant to the mode —
const withJunk = parsePublicColWidths(
  JSON.stringify({
    "0": { mode: "fixed", widthPx: 120, minPx: 60, maxPx: 200 },
    "1": { mode: "hug", minPx: 100, maxPx: 300 },
    "2": { mode: "fill", minPx: 140, maxPx: 400, widthPx: 999 },
  }),
)
assert.equal(withJunk["0"].mode, "fixed")
assert.equal(withJunk["0"].widthPx, 120)
assert.equal(withJunk["0"].minPx, undefined, "fixed mode: minPx must be dropped during sanitize")
assert.equal(withJunk["0"].maxPx, undefined, "fixed mode: maxPx must be dropped during sanitize")
assert.equal(withJunk["1"].mode, "hug")
assert.equal(withJunk["1"].minPx, 100)
assert.equal(withJunk["1"].maxPx, undefined, "hug mode: maxPx must be dropped during sanitize")
assert.equal(withJunk["2"].mode, "fill")
assert.equal(withJunk["2"].minPx, 140, "fill mode: minPx kept")
assert.equal(withJunk["2"].maxPx, 400, "fill mode: maxPx kept")
assert.equal(withJunk["2"].widthPx, undefined, "fill mode: widthPx dropped")

// — publicColStyle ignores stale irrelevant props even if caller passes them —
// fixed: widthPx is the single source of truth regardless of minPx/maxPx stored
assert.deepEqual(
  publicColStyle({ mode: "fixed", widthPx: 220, minPx: 100, maxPx: 500 }),
  { width: 220, minWidth: 220, maxWidth: 220 },
  "fixed: widthPx locks width/min/max to exact same value, ignores stored min/max",
)
// fixed with widthPx absent → fallback to minPx then undefined
const fixedNoWidth = publicColStyle({ mode: "fixed", minPx: 180 })
assert.equal(fixedNoWidth.width, 180, "fixed with no widthPx falls back to minPx once")
assert.equal(fixedNoWidth.minWidth, 180)
assert.equal(fixedNoWidth.maxWidth, 180)

// hug: no maxWidth in CSS output regardless of stored maxPx
const hugStyle = publicColStyle({ mode: "hug", minPx: 80, maxPx: 500 })
assert.equal(hugStyle.width, "1%")
assert.equal(hugStyle.whiteSpace, "nowrap")
assert.equal(hugStyle.minWidth, 80)
assert.ok(!("maxWidth" in hugStyle), "hug: maxWidth must NEVER be emitted — content must be free to overflow nowrap cell")

// fill: both min/max emitted as-is
const fillStyle = publicColStyle({ mode: "fill", minPx: 140, maxPx: 400 })
assert.equal(fillStyle.width, "auto")
assert.equal(fillStyle.minWidth, 140)
assert.equal(fillStyle.maxWidth, 400)

// — Default fallback roundtrip still works —
const widths = resolveTableColWidths({ 0: { mode: "fixed", widthPx: 220 } }, 2)
assert.deepEqual(publicColStyle(widths["0"]), {
  width: 220,
  minWidth: 220,
  maxWidth: 220,
})
assert.deepEqual(widths["1"], { mode: "fill", minPx: 140 })

console.log("resort-table-col-widths.selfcheck: ok")
