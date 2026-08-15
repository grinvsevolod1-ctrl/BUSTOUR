import assert from "node:assert/strict"
import {
  alignmentClass,
  canAddMediaGridElement,
  clampMediaColumns,
  emptyGridRow,
  gridChildCountForColumns,
  gridTrailingSlots,
  isChooserMediaGridCell,
  isMediaGridFirstRowIndex,
  normalizeMediaWidth,
} from "../components/admin/editor/media-helpers"

assert.equal(normalizeMediaWidth("50%"), "50%")
assert.equal(normalizeMediaWidth("320px"), "320px")
assert.equal(normalizeMediaWidth(" 12.5PX "), "12.5px")
assert.equal(normalizeMediaWidth("calc(100% - 2rem)"), null)
assert.equal(normalizeMediaWidth("0%"), null)
assert.equal(alignmentClass("right"), "seo-align-right")
assert.equal(alignmentClass("unknown" as never), "seo-align-center")
assert.equal(clampMediaColumns(1), 2)
assert.equal(clampMediaColumns(3.6), 4)
assert.equal(clampMediaColumns(9), 4)
assert.equal(gridTrailingSlots(0, 3), 3)
assert.equal(gridTrailingSlots(2, 3), 1)
assert.equal(gridTrailingSlots(3, 3), 0)
assert.equal(gridTrailingSlots(4, 2), 0)
assert.equal(gridChildCountForColumns(0, 2), 2)
assert.equal(gridChildCountForColumns(3, 2), 3)
assert.equal(gridChildCountForColumns(1, 4), 4)
assert.equal(gridChildCountForColumns(2, 2), 2)

assert.equal(emptyGridRow(2).length, 2)
assert.equal(emptyGridRow(4)[0]?.type, "mediaGridCell")

const empty = { type: { name: "mediaGridCell" }, childCount: 0 }
const filled = { type: { name: "mediaGridCell" }, childCount: 1 }
assert.equal(isChooserMediaGridCell(empty), true)
assert.equal(isChooserMediaGridCell(filled), false)
assert.equal(canAddMediaGridElement([empty, empty], 2), false)
assert.equal(canAddMediaGridElement([filled, empty], 2), false)
assert.equal(canAddMediaGridElement([filled, filled], 2), true)
assert.equal(canAddMediaGridElement([filled, filled, empty], 2), false)
assert.equal(canAddMediaGridElement([filled, filled, filled], 2), true)
assert.equal(isMediaGridFirstRowIndex(0, 2), true)
assert.equal(isMediaGridFirstRowIndex(1, 2), true)
assert.equal(isMediaGridFirstRowIndex(2, 2), false)

console.log("rich-editor media helpers checks passed")
