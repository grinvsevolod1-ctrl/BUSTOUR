import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

const root = process.cwd()

function read(rel: string) {
  return fs.readFileSync(path.join(root, rel), "utf8")
}

const helper = read("lib/scroll-to-id.ts")
assert.match(helper, /export function scrollToId/)
assert.match(helper, /export function scrollBehavior/)
assert.match(helper, /prefers-reduced-motion/)
assert.match(helper, /ScrollBehavior/)

const listing = read("components/site/tours-listing.tsx")
assert.ok(listing.includes("scroll-to-id"))
assert.ok(listing.includes("tour-search-results"))
assert.ok(listing.includes("TOUR_SEARCH_RESULTS_ID"))
assert.ok(listing.includes("scroll-mt-24"))
assert.ok(listing.includes('aria-live="polite"'))
assert.ok(listing.includes("function onFind"))
assert.ok(listing.includes("scrollToId(TOUR_SEARCH_RESULTS_ID)"))
assert.ok(listing.includes("onClick={onFind}"))
assert.ok(listing.includes("resultsHeadingRef.current?.focus"))

const datesTable = read("components/site/dates-table.tsx")
assert.ok(datesTable.includes("function onFindDate"))
assert.ok(datesTable.includes("onClick={onFindDate}"))
assert.ok(datesTable.includes("scrollIntoView"))
assert.ok(!/\buseEffect\b/.test(datesTable), "dates-table must not use useEffect (scroll magnet)")

console.log("catalog-filter-scroll.selfcheck: ok")
