/**
 * Sitemap CMS visibility filters.
 * Run: npx tsx scripts/sitemap-visibility.selfcheck.ts
 */
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import {
  filterCitiesForSitemap,
  filterCountriesForSitemap,
  isCmsVisible,
} from "../lib/sitemap-visibility"

assert.equal(isCmsVisible({}, "country:bus:x.visible"), true, "missing = visible")
assert.equal(isCmsVisible({ "country:bus:x.visible": "1" }, "country:bus:x.visible"), true)
assert.equal(isCmsVisible({ "country:bus:x.visible": "0" }, "country:bus:x.visible"), false)

const countries = [
  { slug: "pl", category: "bus" },
  { slug: "lt", category: "bus" },
  { slug: "eg", category: "avia" },
]
const settings = {
  "country:bus:lt.visible": "0",
  "country:avia:eg.visible": "0",
}
assert.deepEqual(
  filterCountriesForSitemap(countries, settings).map((c) => c.slug),
  ["pl"],
  "hidden countries dropped",
)

const cities = [
  { slug: "warsaw", category: "bus" },
  { slug: "vilnius", category: "bus" },
]
assert.deepEqual(
  filterCitiesForSitemap(cities, { "city:bus:vilnius.visible": "0" }).map((c) => c.slug),
  ["warsaw"],
  "hidden cities dropped",
)

const root = path.join(import.meta.dirname, "..")
const sitemapSrc = fs.readFileSync(path.join(root, "app/sitemap.ts"), "utf8")
assert.ok(sitemapSrc.includes("filterCountriesForSitemap"), "sitemap filters countries")
assert.ok(sitemapSrc.includes("filterCitiesForSitemap"), "sitemap filters cities")
assert.ok(
  sitemapSrc.includes("getVisibleTours") || sitemapSrc.includes("excludeHidden"),
  "sitemap excludes CMS-hidden tours",
)

console.log("sitemap-visibility.selfcheck: ok")
