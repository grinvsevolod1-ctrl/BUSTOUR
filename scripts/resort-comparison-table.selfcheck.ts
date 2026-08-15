/**
 * Resort comparison tables: plain body text + card layout below lg.
 * Collapsible tables (first open) + show-more when >3 rows / >3 tables.
 * Mobile cards collapse only in single-column layout (< sm); tablet 2-col always open.
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import {
  RESORT_COLLAPSED_ROWS,
  RESORT_COLLAPSED_TABLES,
  resortCardCollapseEnabled,
  visibleSlice,
} from "@/components/site/resort-comparison-table"

const src = readFileSync(join(process.cwd(), "components/site/resort-comparison-table.tsx"), "utf8")

assert.equal(RESORT_COLLAPSED_ROWS, 3)
assert.equal(RESORT_COLLAPSED_TABLES, 3)
assert.deepEqual(visibleSlice([1, 2, 3, 4, 5], false, 3), [1, 2, 3])
assert.deepEqual(visibleSlice([1, 2, 3, 4, 5], true, 3), [1, 2, 3, 4, 5])
assert.deepEqual(visibleSlice([1, 2], false, 3), [1, 2])

// #98: collapse only when one card per row (< Tailwind sm = 640)
assert.equal(resortCardCollapseEnabled(320), true, "phone: collapse ok")
assert.equal(resortCardCollapseEnabled(639), true, "just below sm: collapse ok")
assert.equal(resortCardCollapseEnabled(640), false, "tablet sm: always expanded")
assert.equal(resortCardCollapseEnabled(768), false, "tablet: always expanded")
assert.equal(resortCardCollapseEnabled(1023), false, "below lg cards: always expanded")

assert.doesNotMatch(
  src,
  /ci === 0 \? "font-semibold|td[\s\S]{0,80}font-semibold/,
  "body cells must not force font-semibold by column",
)
assert.match(src, /font-normal leading-relaxed text-ink/, "body cells default to font-normal")

assert.match(src, /lg:hidden/, "mobile/tablet card layout")
assert.match(src, /hidden[\s\S]{0,80}lg:block/, "desktop table from lg")
assert.match(src, /<dl|<dt|<dd/, "cards map columns to labeled fields")
assert.match(src, /sm:grid-cols-2/, "tablet two-column card grid")
assert.match(src, /gap-4/, "card grid gap-4")
assert.match(src, /border-line/, "cards use soft line border, not brand frame")
assert.doesNotMatch(
  src,
  /article[\s\S]{0,120}border-brand/,
  "mobile cards must not use sharp brand border",
)
assert.match(src, /rounded-t-xl/, "card header rounds top corners")
assert.match(src, /text-\[11px\].*tracking-wider|tracking-wider[\s\S]{0,40}text-\[11px\]/, "quiet uppercase labels")
assert.match(src, /columns\.slice\(1\)|ci === 0|row\[0\]/, "first column is card title without label")

assert.match(src, /"use client"/, "client for collapse state")
assert.match(src, /<details/, "collapsible sections")
assert.match(src, /Показать больше|Показать все/, "show-more label")
assert.match(src, /RESORT_COLLAPSED_ROWS|visibleSlice/, "row collapse helpers")

// #98: tablet multi-col cards stay open — no accordion chevron when not single-col
assert.match(src, /max-width:\s*639px|resortCardCollapseEnabled/, "single-col MQ for card collapse")
assert.match(src, /useSyncExternalStore|matchMedia/, "live breakpoint for card collapse")
assert.match(src, /<article/, "non-collapsible card is a static article")
assert.match(
  src,
  /if\s*\(\s*!collapsible\s*\)[\s\S]{0,200}<article/,
  "tablet path: article without accordion when not collapsible",
)

console.log("resort-comparison-table.selfcheck: ok")
