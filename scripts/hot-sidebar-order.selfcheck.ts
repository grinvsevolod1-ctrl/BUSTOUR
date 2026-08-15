/**
 * Hot sidebar country order follows CMS countries.sortOrder, not city order.
 * Run: npx tsx scripts/hot-sidebar-order.selfcheck.ts
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { orderHotSidebarCountryNames } from "../lib/hot-destinations"

const root = process.cwd()

// Pure order: CMS list wins even when cities arrive in reverse order
const ordered = orderHotSidebarCountryNames({
  hotCountries: [
    { name: "Турция", slug: "turciya" },
    { name: "Египет", slug: "egipet" },
    { name: "ОАЭ", slug: "oae" },
  ],
  rawCitiesByCountry: {
    Египет: [{ slug: "hurghada" }],
    Турция: [{ slug: "antalya" }],
    // ОАЭ: country-only (no cities)
  },
})
assert.deepEqual(ordered, ["Турция", "Египет", "ОАЭ"])

// Hidden country skipped
const filtered = orderHotSidebarCountryNames({
  hotCountries: [
    { name: "Турция", slug: "turciya" },
    { name: "Египет", slug: "egipet" },
  ],
  rawCitiesByCountry: {
    Турция: [{}],
    Египет: [{}],
  },
  settings: { "country:hot:egipet.visible": "0" },
})
assert.deepEqual(filtered, ["Турция"])

// Orphan city country (not in hotCountries) appended last
const orphan = orderHotSidebarCountryNames({
  hotCountries: [{ name: "Турция", slug: "turciya" }],
  rawCitiesByCountry: {
    Орфан: [{}],
    Турция: [{}],
  },
})
assert.deepEqual(orphan, ["Турция", "Орфан"])

// Wiring: no Object.keys-driven primary order
const src = readFileSync(join(root, "lib/hot-destinations.ts"), "utf8")
assert.match(src, /orderHotSidebarCountryNames/)
assert.doesNotMatch(
  src,
  /const countryNames = Object\.keys\(citiesByCountry\)/,
  "must not order sidebar from city Object.keys",
)
assert.match(
  readFileSync(join(root, "app/(site)/hot/page.tsx"), "utf8"),
  /getHotSidebarData/,
)

console.log("ok")
