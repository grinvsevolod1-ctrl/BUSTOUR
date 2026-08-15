/**
 * Public home pages must render every admin section key (not swallow cities).
 * Run: npx tsx scripts/home-section-parity.selfcheck.ts
 */
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")

const HOMES: { rel: string; label: string; mustRenderCities: boolean }[] = [
  { rel: "app/(site)/aviatory/page.tsx", label: "avia home", mustRenderCities: true },
  { rel: "app/(site)/hot/page.tsx", label: "hot home", mustRenderCities: true },
  { rel: "app/(site)/avtobusnye-tury/page.tsx", label: "bus home", mustRenderCities: true },
]

const SECTION_MARKERS = [
  { key: "cities", re: /key\s*===\s*["']cities["']|DestinationSectionMap/ },
  { key: "resorts", re: /resorts|ResortComparisonBlocks|DestinationSectionMap/ },
  { key: "seo", re: /seoHtml|seoTitle|DestinationSectionMap/ },
  { key: "faq", re: /OrderedFaqSection|getFaqBlocksForPage|DestinationSectionMap/ },
  { key: "callus", re: /CallUs|section\.callus|DestinationSectionMap/ },
]

const mapSrc = fs.readFileSync(
  path.join(root, "components/site/catalog/destination-section-map.tsx"),
  "utf8",
)
assert.ok(/key\s*===\s*["']cities["']/.test(mapSrc), "DestinationSectionMap renders cities")
assert.ok(mapSrc.includes("OrderedFaqSection"), "DestinationSectionMap renders FAQ")
assert.ok(mapSrc.includes("OrderedCallUs"), "DestinationSectionMap renders callus")

for (const home of HOMES) {
  const src = fs.readFileSync(path.join(root, home.rel), "utf8")
  for (const m of SECTION_MARKERS) {
    assert.ok(m.re.test(src), `${home.label}: must mention ${m.key} rendering`)
  }
  if (home.mustRenderCities) {
    assert.ok(
      !/if\s*\(\s*key\s*===\s*["']cities["']\s*\)\s*return\s+null/.test(src),
      `${home.label}: must not swallow cities with return null`,
    )
    assert.ok(src.includes("ResortCards"), `${home.label}: cities section uses ResortCards`)
    assert.ok(src.includes('cardKind="country"') || src.includes("cardKind='country'"), `${home.label}: home cards are countries`)
  }
}

console.log("home-section-parity.selfcheck: ok")
