import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const root = join(import.meta.dirname, "..")
const read = (path: string) => readFileSync(join(root, path), "utf8")

for (const path of ["app/admin/country-actions.ts", "app/admin/city-actions.ts"]) {
  const source = read(path)
  assert.match(source, /save(?:Country|City)Aggregate/, `${path}: canonical action delegates one aggregate save`)
  const canonical = source.slice(source.indexOf(`export async function save${path.includes("country") ? "Country" : "City"}Action`), source.indexOf("export async function save" + (path.includes("country") ? "CountryBaseAction" : "CityBaseAction")))
  assert.doesNotMatch(canonical, /await rekeyPageScopedContent\(/, `${path}: action must not commit rekey separately`)
  assert.doesNotMatch(canonical, /await replacePageFaqs\(/, `${path}: action must not commit FAQ separately`)
}

const aggregate = read("lib/destination-aggregate.ts")
assert.match(aggregate, /db\.transaction\(async \(tx\)/, "aggregate save owns one PostgreSQL transaction")
assert.match(aggregate, /rekeyPageScopedContent\([^)]*tx/s, "scope rekey uses aggregate transaction")
assert.match(aggregate, /replacePageFaqs\([^)]*tx/s, "FAQ replacement uses aggregate transaction")
assert.match(aggregate, /saveSettings\([^)]*tx/s, "settings save uses aggregate transaction")
assert.match(read("lib/page-rekey.ts"), /Область[^\n]+уже содержит/, "scope collision has structured Russian error")

const rekey = read("lib/page-rekey.ts")
assert.doesNotMatch(rekey, /delete\(settings\)[\s\S]{0,180}newPageKey/, "rekey must not delete destination settings")
assert.doesNotMatch(rekey, /delete\(contentBlocks\)[\s\S]{0,100}newPageKey/, "rekey must not delete destination content")

console.log("destination-aggregate-transaction.selfcheck: ok")
