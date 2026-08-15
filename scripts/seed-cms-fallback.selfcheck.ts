/**
 * #15–#18: public catalog pages must not resurrect seed entity intro/sections;
 * city save must revalidate live catalog URLs (not dead /tours/*).
 * Run: npx tsx scripts/seed-cms-fallback.selfcheck.ts
 */
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import {
  flattenCitySectionsToHtml,
  resolveCmsText,
  shouldRenderLegacyEntityBody,
} from "../lib/catalog-cms-content"

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")

// --- pure helpers (behavior contract) ---
assert.equal(resolveCmsText("CMS intro", "SEED intro"), "CMS intro")
assert.equal(resolveCmsText("", "SEED intro"), "")
assert.equal(resolveCmsText("  ", "SEED"), "")
assert.equal(shouldRenderLegacyEntityBody(["seo", "faq"]), false)
assert.equal(shouldRenderLegacyEntityBody(["cities"]), false)
assert.ok(flattenCitySectionsToHtml([{ title: "A", body: ["p1"] }]).includes("A"))
assert.ok(flattenCitySectionsToHtml([{ title: "A", body: ["p1"] }]).includes("p1"))

const CITY_PAGES = [
  "app/(site)/avtobusnye-tury/[countrySlug]/[citySlug]/page.tsx",
  "app/(site)/aviatory/[countrySlug]/[citySlug]/page.tsx",
  "app/(site)/hot/[countrySlug]/[citySlug]/page.tsx",
]
const COUNTRY_PAGES = [
  "app/(site)/avtobusnye-tury/[countrySlug]/page.tsx",
  "app/(site)/aviatory/[countrySlug]/page.tsx",
  "app/(site)/hot/[countrySlug]/page.tsx",
]

for (const rel of CITY_PAGES) {
  const src = fs.readFileSync(path.join(root, rel), "utf8")
  assert.ok(!/\|\|\s*info\.intro/.test(src), `${rel}: must not fall back to info.intro`)
  assert.ok(!/info\.sections\.map/.test(src), `${rel}: must not render info.sections`)
  assert.ok(!/info\.seoHtml/.test(src), `${rel}: must not render info.seoHtml`)
  assert.ok(/resolveCmsText\(/.test(src) || /get\(["']intro["']\)/.test(src), `${rel}: CMS intro`)
}

for (const rel of COUNTRY_PAGES) {
  const src = fs.readFileSync(path.join(root, rel), "utf8")
  assert.ok(!/\|\|\s*country\.intro/.test(src), `${rel}: must not fall back to country.intro`)
  assert.ok(!/country\.seoHtml/.test(src) || /get\(["']seo/.test(src), `${rel}: no raw country.seoHtml fallback preferred`)
}

// Stronger: country.seoHtml only via gated legacy is also banned
for (const rel of [...CITY_PAGES, ...COUNTRY_PAGES]) {
  const src = fs.readFileSync(path.join(root, rel), "utf8")
  assert.ok(!/country\.seoHtml/.test(src), `${rel}: must not render country.seoHtml entity fallback`)
}

const cityActions = fs.readFileSync(path.join(root, "app/admin/city-actions.ts"), "utf8")
assert.ok(!/revalidatePath\(`\/tours\//.test(cityActions), "city-actions: no dead /tours revalidatePath")
assert.ok(
  /avtobusnye-tury|revalidateCatalog|revalidateSite/.test(cityActions),
  "city-actions: must revalidate live catalog paths",
)

console.log("seed-cms-fallback.selfcheck: ok")
