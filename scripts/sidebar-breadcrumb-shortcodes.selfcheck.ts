/**
 * Breadcrumb + catalog sidebars expand `[Y]` (and other shortcodes) for display only.
 *
 * Run: npx tsx scripts/sidebar-breadcrumb-shortcodes.selfcheck.ts
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { parseShortcodes } from "../lib/parse-shortcodes"

const root = process.cwd()
const read = (rel: string) => readFileSync(join(root, rel), "utf8")

assert.equal(parseShortcodes("Хургада[Y]", { Y: "2026" }), "Хургада2026")
assert.equal(parseShortcodes("Хургада [Y]", { Y: "2026" }), "Хургада 2026")

const breadcrumb = read("components/site/breadcrumb.tsx")
assert.match(breadcrumb, /expandShortcodes/)
assert.match(breadcrumb, /await expandShortcodes\(item\.label\)/)
assert.match(breadcrumb, /name:\s*item\.label/)
assert.match(breadcrumb, /getSiteOrigin/, "schema item URLs from site.url settings")
assert.match(breadcrumb, /getPublicSettings/, "loads CMS settings for origin")

for (const file of [
  "components/site/avia-sidebar.tsx",
  "components/site/hot-sidebar.tsx",
  "components/site/tours-sidebar.tsx",
] as const) {
  const src = read(file)
  assert.match(src, /shortcodesDict/, `${file}: shortcodesDict prop`)
  assert.match(src, /from ["']@\/lib\/parse-shortcodes["']/, `${file}: client-safe parse import`)
  assert.match(src, /parseShortcodes\(/, `${file}: parseShortcodes on labels`)
  assert.match(src, /label:\s*parseShortcodes/, `${file}: label uses parseShortcodes`)
  assert.doesNotMatch(src, /from ["']@\/lib\/shortcodes["']/, `${file}: must not pull DB shortcodes module`)
}

const toursListing = read("components/site/tours-listing.tsx")
assert.match(toursListing, /shortcodesDict/)
assert.match(toursListing, /shortcodesDict=\{shortcodesDict\}/)

const publicTours = read("components/site/public-tours.tsx")
assert.match(publicTours, /getShortcodesDict/)
assert.match(publicTours, /shortcodesDict=\{shortcodesDict\}/)

const aviaPages = [
  "app/(site)/aviatory/page.tsx",
  "app/(site)/aviatory/[countrySlug]/page.tsx",
  "app/(site)/aviatory/[countrySlug]/[citySlug]/page.tsx",
] as const
for (const file of aviaPages) {
  const src = read(file)
  assert.match(src, /getShortcodesDict/, `${file}: loads dict`)
  assert.match(src, /shortcodesDict=\{shortcodesDict\}/, `${file}: passes to AviaSidebar`)
}

const hotPages = [
  "app/(site)/hot/page.tsx",
  "app/(site)/hot/[countrySlug]/page.tsx",
  "app/(site)/hot/[countrySlug]/[citySlug]/page.tsx",
] as const
for (const file of hotPages) {
  const src = read(file)
  assert.match(src, /getShortcodesDict/, `${file}: loads dict`)
  assert.match(src, /shortcodesDict=\{shortcodesDict\}/, `${file}: passes to HotSidebar`)
}

console.log("sidebar-breadcrumb-shortcodes.selfcheck: ok")
