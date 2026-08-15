import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

const listing = readFileSync("components/site/tours-listing.tsx", "utf8")
const slider = readFileSync("components/ui/slider.tsx", "utf8")
const popover = readFileSync("components/ui/popover.tsx", "utf8")
const dropdown = readFileSync("components/site/dropdown.tsx", "utf8")
const datePicker = readFileSync("components/ui/date-range-picker.tsx", "utf8")

assert.match(slider, /@radix-ui\/react-slider/, "Slider must wrap Radix Slider")
assert.match(listing, /function PriceRangePicker/, "PriceRangePicker must exist")
assert.match(listing, /<Slider/, "Price filter must render a dual-range slider")
assert.match(listing, /minStepsBetweenThumbs/, "Slider thumbs must not cross")
assert.match(listing, /От[\s\S]*<input/, "Price filter must render the From input")
assert.match(listing, /До[\s\S]*<input/, "Price filter must render the To input")
assert.match(listing, /currencySymbol/, "Currency marker must be displayed once for the input group")
assert.doesNotMatch(listing, /Цена указана за 1 человека/, "Per-person price note must stay removed")
assert.match(listing, /PRICE_FROM_PARAM = "priceFrom"/, "priceFrom URL param must be supported")
assert.match(listing, /PRICE_TO_PARAM = "priceTo"/, "priceTo URL param must be supported")
assert.match(listing, /PRICE_DEBOUNCE_MS = 400/, "URL sync must be debounced")
assert.match(listing, /window\.setTimeout/, "Price URL sync must use debounce timer")
assert.doesNotMatch(listing, /priceRanges\.map/, "Old preset price dropdown must stay removed")
assert.doesNotMatch(popover, /fixed inset-x-3 bottom-3/, "mobile price popover must stay anchored to its trigger")
assert.match(popover, /absolute left-0 top-full/, "price popover must open below its trigger")
assert.match(dropdown, /chevronClassName = "h-5 w-5/, "shared dropdown arrow must use the common size")
assert.match(datePicker, /mr-[34] h-5 w-5/, "date picker arrow must use the common size")
assert.match(listing, /chevronClassName="h-5 w-5 text-white"/, "currency arrow must use the common size")

console.log("price-filter.selfcheck: ok")
