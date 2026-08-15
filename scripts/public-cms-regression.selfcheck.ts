/**
 * Regression net for catalog public CMS bugs (#7–#12 class):
 * - homes must render cities (not swallow)
 * - country/city must read CMS h1/intro/sections.order/seo/faq/cities
 * - FAQ page-scoped (not page.tours.faq alone); admin single-save
 * - sidebar: no «Все направления»; city visibility filter
 *
 * Matrix: bus/avia/hot × home/country/city (+ site home FAQ).
 * Run: npx tsx scripts/public-cms-regression.selfcheck.ts
 */
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const read = (rel: string) => fs.readFileSync(path.join(root, rel), "utf8")
const exists = (rel: string) => fs.existsSync(path.join(root, rel))

type PageKind = "home" | "country" | "city"

const CATALOG: { rel: string; label: string; kind: PageKind; cat: "bus" | "avia" | "hot" }[] = [
  { rel: "app/(site)/avtobusnye-tury/page.tsx", label: "bus home", kind: "home", cat: "bus" },
  { rel: "app/(site)/avtobusnye-tury/[countrySlug]/page.tsx", label: "bus country", kind: "country", cat: "bus" },
  { rel: "app/(site)/avtobusnye-tury/[countrySlug]/[citySlug]/page.tsx", label: "bus city", kind: "city", cat: "bus" },
  { rel: "app/(site)/aviatory/page.tsx", label: "avia home", kind: "home", cat: "avia" },
  { rel: "app/(site)/aviatory/[countrySlug]/page.tsx", label: "avia country", kind: "country", cat: "avia" },
  { rel: "app/(site)/aviatory/[countrySlug]/[citySlug]/page.tsx", label: "avia city", kind: "city", cat: "avia" },
  { rel: "app/(site)/hot/page.tsx", label: "hot home", kind: "home", cat: "hot" },
  { rel: "app/(site)/hot/[countrySlug]/page.tsx", label: "hot country", kind: "country", cat: "hot" },
  { rel: "app/(site)/hot/[countrySlug]/[citySlug]/page.tsx", label: "hot city", kind: "city", cat: "hot" },
]

const CMS_MARKERS = [
  { name: "CMS h1", re: /get\(["']h1["']\)|settings\[`\$\{p\}\.h1`\]/ },
  { name: "sections.order", re: /sections\.order/ },
  { name: "citiesTitle", re: /citiesTitle/ },
  // Shared DestinationSectionMap covers seo/faq/cities/callus wiring
  { name: "CMS seo slot", re: /seoHtml\$\{|seoTitle\$\{|DestinationSectionMap/ },
  { name: "getFaqBlocksForPage", re: /getFaqBlocksForPage|DestinationSectionMap/ },
  { name: "section.cities", re: /section\.cities|DestinationSectionMap/ },
  { name: "ResortCards", re: /ResortCards/ },
  { name: "CallUs section", re: /section\.callus|CallUs|DestinationSectionMap/ },
]

const findings: string[] = []

function fail(msg: string): never {
  findings.push(`FAIL: ${msg}`)
  assert.fail(msg)
}

function check(cond: boolean, msg: string) {
  if (!cond) fail(msg)
  findings.push(`ok: ${msg}`)
}

{
  const map = read("components/site/catalog/destination-section-map.tsx")
  check(/seoHtml\$\{/.test(map) && /seoTitle\$\{/.test(map), "DestinationSectionMap: CMS seo slot")
  check(map.includes("section.cities"), "DestinationSectionMap: section.cities")
  check(map.includes("OrderedFaqSection"), "DestinationSectionMap: FAQ")
  check(map.includes("OrderedCallUs"), "DestinationSectionMap: CallUs")
}

// ── 1) Catalog matrix: CMS wiring on every public page ─────────────────
for (const page of CATALOG) {
  check(exists(page.rel), `${page.label}: file exists`)
  const src = read(page.rel)

  for (const m of CMS_MARKERS) {
    check(m.re.test(src), `${page.label}: ${m.name}`)
  }

  // #9 — must not swallow cities section
  check(
    !/if\s*\(\s*key\s*===\s*["']cities["']\s*\)\s*return\s+null/.test(src),
    `${page.label}: must not swallow cities with bare return null`,
  )

  // #7/#8/#12 — no tours-listing FAQ toggle as sole FAQ source
  const usesToursFaq = /isOn\(settings,\s*["']page\.tours\.faq["']\)/.test(src)
  if (usesToursFaq) {
    check(/getFaqBlocksForPage/.test(src), `${page.label}: page.tours.faq only with page-scoped FAQ`)
  }

  // country/city must gate cities via section visibility (map or inline)
  if (page.kind === "country" || page.kind === "city") {
    check(
      /section\.cities/.test(src) || src.includes("DestinationSectionMap"),
      `${page.label}: cities section visibility key`,
    )
  }
}

// site home FAQ scope
{
  const home = read("app/(site)/page.tsx")
  check(/getFaqBlocksForPage/.test(home), "site home: getFaqBlocksForPage")
}

// ── 2) Sidebar / visibility (#10/#11) ───────────────────────────────────
{
  const listing = read("components/site/tours-listing.tsx")
  check(listing.includes("ALL_DESTINATIONS"), "filter keeps Все направления")
  check(listing.includes("countryOptions"), "sidebar countryOptions exist")
  check(
    !/ToursSidebar[\s\S]{0,200}options=\{destinationOptions\}/.test(listing),
    "ToursSidebar must not use destinationOptions",
  )
  check(
    /ToursSidebar[\s\S]{0,200}options=\{countryOptions\}/.test(listing),
    "ToursSidebar uses countryOptions",
  )

  const citiesLib = read("lib/cities.ts")
  check(
    citiesLib.includes("city:${c.category}:${c.slug}.visible"),
    "getCitiesByCountry filters city:{cat}:{slug}.visible",
  )
  const fnBody = citiesLib.slice(citiesLib.indexOf("export async function getCitiesByCountry"))
  check(/getSettings\(\)/.test(fnBody), "getCitiesByCountry can load settings when omitted")
}

// ── 3) FAQ admin single-save (#7) ───────────────────────────────────────
{
  const faqForm = read("components/admin/page-faq-form.tsx")
  check(!faqForm.includes("Сохранить FAQ"), "admin FAQ: no local Save FAQ button")
  check(faqForm.includes("formId"), "admin FAQ: formId portal wiring")

  // every admin page that mentions PageFaqForm or buildFaqFormIds
  const adminRoot = path.join(root, "app/admin")
  const walk = (dir: string, out: string[] = []): string[] => {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, ent.name)
      if (ent.isDirectory()) walk(p, out)
      else if (ent.name === "page.tsx") out.push(p)
    }
    return out
  }
  const adminPages = walk(adminRoot)
  let faqAdminCount = 0
  for (const abs of adminPages) {
    const src = fs.readFileSync(abs, "utf8")
    if (!src.includes("buildFaqFormIds") && !src.includes("PageFaqForm")) continue
    faqAdminCount++
    const rel = path.relative(root, abs).replace(/\\/g, "/")
    check(src.includes("buildFaqFormIds"), `${rel}: buildFaqFormIds`)
    check(!src.includes("Сохранить FAQ"), `${rel}: no Сохранить FAQ`)
    check(!/extraFormIds=\{\[`page-faq-form-\$\{/.test(src), `${rel}: no bare page-faq-form extraFormIds`)
  }
  check(faqAdminCount >= 10, `FAQ admin pages scanned (>=10, got ${faqAdminCount})`)
}

console.log("public-cms-regression.selfcheck: ok")
console.log(`checks: ${findings.filter((f) => f.startsWith("ok:")).length}`)
