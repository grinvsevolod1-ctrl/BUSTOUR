/**
 * Country/city public pages must render admin CMS keys (h1/intro/sections.order/seo/faq/cities),
 * not only DB entity fields. Covers bus/avia/hot × country/city.
 * Run: npx tsx scripts/cms-page-section-parity.selfcheck.ts
 */
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")

const PAGES: { rel: string; label: string; prefixKind: "city" | "country" }[] = [
  { rel: "app/(site)/avtobusnye-tury/[countrySlug]/[citySlug]/page.tsx", label: "bus city", prefixKind: "city" },
  { rel: "app/(site)/avtobusnye-tury/[countrySlug]/page.tsx", label: "bus country", prefixKind: "country" },
  { rel: "app/(site)/aviatory/[countrySlug]/[citySlug]/page.tsx", label: "avia city", prefixKind: "city" },
  { rel: "app/(site)/aviatory/[countrySlug]/page.tsx", label: "avia country", prefixKind: "country" },
  { rel: "app/(site)/hot/[countrySlug]/[citySlug]/page.tsx", label: "hot city", prefixKind: "city" },
  { rel: "app/(site)/hot/[countrySlug]/page.tsx", label: "hot country", prefixKind: "country" },
]

const MARKERS = [
  { name: "CMS h1", re: /get\(["']h1["']\)|settings\[`\$\{p\}\.h1`\]/ },
  { name: "sections.order", re: /sections\.order/ },
  { name: "citiesTitle", re: /citiesTitle/ },
  // DestinationSectionMap owns seoHtml${suffix} / OrderedFaq / cities gate
  { name: "CMS seoHtml", re: /seoHtml\$\{|seoTitle\$\{|DestinationSectionMap/ },
  { name: "getFaqBlocksForPage", re: /getFaqBlocksForPage|DestinationSectionMap/ },
  { name: "section.cities gate", re: /section\.cities|DestinationSectionMap/ },
]

const mapSrc = fs.readFileSync(
  path.join(root, "components/site/catalog/destination-section-map.tsx"),
  "utf8",
)
assert.ok(/seoHtml\$\{/.test(mapSrc) && /seoTitle\$\{/.test(mapSrc), "map: CMS seo slots")
assert.ok(mapSrc.includes("section.cities"), "map: cities gate")
assert.ok(mapSrc.includes("OrderedFaqSection"), "map: FAQ")

for (const page of PAGES) {
  const full = path.join(root, page.rel)
  assert.ok(fs.existsSync(full), `${page.label}: missing ${page.rel}`)
  const src = fs.readFileSync(full, "utf8")
  for (const m of MARKERS) {
    assert.ok(m.re.test(src), `${page.label}: must render ${m.name}`)
  }
  // Must not rely only on global tours FAQ/callus for page sections
  if (page.prefixKind === "city" || page.prefixKind === "country") {
    assert.ok(
      !/isOn\(settings,\s*["']page\.tours\.faq["']\)/.test(src) || /getFaqBlocksForPage/.test(src),
      `${page.label}: page-scoped FAQ preferred over page.tours.faq alone`,
    )
  }
}

console.log("cms-page-section-parity.selfcheck: ok")
