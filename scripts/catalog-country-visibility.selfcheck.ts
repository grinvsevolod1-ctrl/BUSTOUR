/**
 * New countries start hidden; explicit publication controls catalog visibility.
 * Run: npx tsx scripts/catalog-country-visibility.selfcheck.ts
 */
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { isCmsVisible } from "../lib/sitemap-visibility"

// Catalog rule: country key alone. Missing / "1" = show. No city required.
assert.equal(isCmsVisible({}, "country:hot:eg.visible"), true)
assert.equal(isCmsVisible({ "country:hot:eg.visible": "1" }, "country:hot:eg.visible"), true)
assert.equal(isCmsVisible({ "country:hot:eg.visible": "0" }, "country:hot:eg.visible"), false)

const root = path.join(import.meta.dirname, "..")
const countryActions = fs.readFileSync(path.join(root, "app/admin/country-actions.ts"), "utf8")

// Create must explicitly start hidden (visible "0")
assert.match(countryActions, /\[`\$\{pageKey\}\.visible`\]:\s*"0"/, "country create must set visible=0")

// Homes filter by country visible only (not by cities)
for (const file of ["app/(site)/hot/page.tsx", "app/(site)/avtobusnye-tury/page.tsx"]) {
  const src = fs.readFileSync(path.join(root, file), "utf8")
  assert.match(
    src,
    /country:(?:hot|bus):\$\{c\.slug\}\.visible/,
    `${file}: cards filter country.visible`,
  )
  assert.doesNotMatch(
    src,
    /hasPublishedCity|hasVisibleCity|isCountryPublic/,
    `${file}: no city-gated country listing`,
  )
}

assert.ok(
  fs.existsSync(path.join(root, "scripts/migrate-country-visible-default.ts")),
  "one-shot migrate for legacy visible=0 countries",
)

console.log("catalog-country-visibility.selfcheck: ok")
