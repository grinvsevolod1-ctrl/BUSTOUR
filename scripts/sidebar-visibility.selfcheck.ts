/**
 * Sidebar must not list «Все направления»; city sidebars must filter visibility.
 * Run: npx tsx scripts/sidebar-visibility.selfcheck.ts
 */
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")

const listing = fs.readFileSync(path.join(root, "components/site/tours-listing.tsx"), "utf8")
assert.ok(listing.includes("ALL_DESTINATIONS"), "filter still has Все направления")
assert.ok(listing.includes("countryOptions"), "sidebar countries split from filter options")
assert.ok(
  !/ToursSidebar[\s\S]{0,200}options=\{destinationOptions\}/.test(listing),
  "ToursSidebar options must not be destinationOptions (includes Все направления)",
)
assert.ok(/ToursSidebar[\s\S]{0,200}options=\{countryOptions\}/.test(listing), "sidebar uses countryOptions")

const citiesLib = fs.readFileSync(path.join(root, "lib/cities.ts"), "utf8")
assert.ok(
  citiesLib.includes("city:${c.category}:${c.slug}.visible"),
  "getCitiesByCountry filters city visibility",
)

const listingSrc = fs.readFileSync(path.join(root, "components/site/tours-listing.tsx"), "utf8")
assert.ok(listingSrc.includes("visibleCountryNames"), "bus sidebar filters hidden countries")
assert.ok(
  listingSrc.includes("ordered = [...visibleCountryNames]"),
  "bus sidebar keeps visible countries without requiring tours",
)

const countriesLib = fs.readFileSync(path.join(root, "lib/countries.ts"), "utf8")
assert.ok(countriesLib.includes("visibleCountryNames"), "visibleCountryNames helper exists")
assert.ok(countriesLib.includes("getAviaCountries"), "avia countries helper")
assert.ok(
  /country:\$\{c\.category\}:\$\{c\.slug\}\.visible/.test(countriesLib) ||
    countriesLib.includes('country:${c.category}:${c.slug}.visible'),
  "getAviaCountries filters country visibility",
)
assert.ok(
  /settings \? Promise\.resolve\(settings\) : getSettings\(\)/.test(citiesLib) ||
    citiesLib.includes("settings ??") ||
    /getSettings\(\)/.test(citiesLib.split("getCitiesByCountry")[1] ?? ""),
  "getCitiesByCountry loads settings when omitted",
)

for (const rel of [
  "app/(site)/avtobusnye-tury/page.tsx",
  "app/(site)/avtobusnye-tury/[countrySlug]/page.tsx",
  "app/(site)/avtobusnye-tury/[countrySlug]/[citySlug]/page.tsx",
]) {
  const src = fs.readFileSync(path.join(root, rel), "utf8")
  assert.ok(src.includes("visibleCountryNames"), `${rel}: passes visibleCountryNames`)
}

console.log("sidebar-visibility.selfcheck: ok")
