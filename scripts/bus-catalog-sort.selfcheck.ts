import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8")
const listing = read("components/site/tours-listing.tsx")
const types = read("lib/types.ts")
// mapTour lives in the shared module behind the lib/queries.ts barrel
const queries = read("lib/queries/_shared.ts")

assert.match(listing, /category\s*===\s*["']bus["']/)
assert.match(listing, /value:\s*["']popularity["'],\s*label:\s*["']По популярности["']/)
assert.match(listing, /sort\s*===\s*["']popularity["'][\s\S]*?sortOrder/)
assert.match(types, /export type Tour\s*=\s*\{[\s\S]*?sortOrder:\s*number/)
assert.match(queries, /function mapTour[\s\S]*?sortOrder:\s*row\.sortOrder/)

console.log("bus-catalog-sort.selfcheck: ok")
