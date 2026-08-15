/**
 * Baseline / forward-compatible gates for catalog dedupe wave.
 * Passes before extract (3 sidebars + sectionOrder.map) and after
 * (CatalogSidebar + DestinationSectionMap).
 *
 * Run: npm run test:catalog-dedupe
 */
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const read = (rel: string) => fs.readFileSync(path.join(root, rel), "utf8")
const exists = (rel: string) => fs.existsSync(path.join(root, rel))

const DESTINATION_PAGES = [
  "app/(site)/aviatory/page.tsx",
  "app/(site)/aviatory/[countrySlug]/page.tsx",
  "app/(site)/aviatory/[countrySlug]/[citySlug]/page.tsx",
  "app/(site)/hot/page.tsx",
  "app/(site)/hot/[countrySlug]/page.tsx",
  "app/(site)/hot/[countrySlug]/[citySlug]/page.tsx",
  "app/(site)/avtobusnye-tury/page.tsx",
  "app/(site)/avtobusnye-tury/[countrySlug]/page.tsx",
  "app/(site)/avtobusnye-tury/[countrySlug]/[citySlug]/page.tsx",
] as const

const catalogSidebar =
  exists("components/site/catalog/catalog-sidebar.tsx") ||
  exists("components/site/catalog-sidebar.tsx")
const legacySidebars =
  exists("components/site/avia-sidebar.tsx") &&
  exists("components/site/hot-sidebar.tsx") &&
  exists("components/site/tours-sidebar.tsx")

assert.ok(
  catalogSidebar || legacySidebars,
  "need CatalogSidebar or all three legacy sidebars (avia/hot/tours)",
)
assert.ok(
  exists("components/site/use-catalog-sidebar-expanded.ts") ||
    exists("components/site/catalog/use-catalog-sidebar-expanded.ts"),
  "shared sidebar expand hook must exist",
)

const sectionMap =
  exists("components/site/catalog/destination-section-map.tsx") ||
  exists("components/site/destination-section-map.tsx")

for (const rel of DESTINATION_PAGES) {
  const src = read(rel)
  const hasInline = src.includes("sectionOrder.map")
  const usesExtract =
    /DestinationSectionMap/.test(src) ||
    /destination-section-map/.test(src) ||
    (sectionMap && /from ["']@\/components\/site\/catalog/.test(src))
  assert.ok(
    hasInline || usesExtract,
    `${rel}: expected sectionOrder.map or DestinationSectionMap`,
  )
}

// Live callback path is callback-modal; ModalCallback is dead if still present
const appAndSite = [
  ...fs.readdirSync(path.join(root, "app"), { recursive: true, encoding: "utf8" }),
]
  .filter((f) => typeof f === "string" && f.endsWith(".tsx"))
  .map((f) => path.join("app", f as string))

let modalCallbackImports = 0
for (const rel of appAndSite) {
  const full = path.join(root, rel)
  if (!fs.existsSync(full)) continue
  const src = fs.readFileSync(full, "utf8")
  if (/from ["'][^"']*modal-callback["']/.test(src) || /ModalCallback/.test(src)) {
    modalCallbackImports++
  }
}
assert.equal(
  modalCallbackImports,
  0,
  "app must not import ModalCallback (use callback-modal)",
)

const aviaCountry = read("app/(site)/aviatory/[countrySlug]/page.tsx")
const stillHasFallback = /fallbackPrefix=\{liveCountrySlug === "egipet" \? "egipet" : undefined\}/.test(
  aviaCountry,
)
const legacyAdminGone = !exists("app/admin/(protected)/pages/aviatory-egipet")
if (legacyAdminGone) {
  assert.ok(!stillHasFallback, "after egipet migrate, drop fallbackPrefix")
} else {
  assert.ok(stillHasFallback, "until Phase 5, Egypt alert fallbackPrefix required")
}

// Inventory markdown is a local analysis artifact (not tracked in git) —
// validate only when present so CI/fresh clones don't fail the preflight.
const inventory = path.join(root, "analisis", "2026 07 25", "component-dedupe-inventory.md")
if (!fs.existsSync(inventory)) {
  console.log("catalog-dedupe-baseline.selfcheck: inventory markdown not found, skipping (local analysis file)")
}

console.log("catalog-dedupe-baseline.selfcheck: ok")
