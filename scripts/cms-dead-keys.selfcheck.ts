/**
 * Catalog CMS keys that admin can save but public never reads
 * (same failure class as missing PageAlert mounts).
 *
 * Run: npx tsx scripts/cms-dead-keys.selfcheck.ts
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { pageSettingsGroups } from "@/lib/admin-config"

const siteRoot = join(process.cwd(), "app", "(site)")
const aviaCountry = readFileSync(join(siteRoot, "aviatory", "[countrySlug]", "page.tsx"), "utf8")
const hotPage = readFileSync(join(siteRoot, "hot", "page.tsx"), "utf8")
const allSite = [
  aviaCountry,
  hotPage,
  readFileSync(join(siteRoot, "aviatory", "page.tsx"), "utf8"),
].join("\n")

/** Explicit inventory — shrink by deleting admin fields or wiring public readers. */
const DEAD_CATALOG_KEYS: { key: string; reason: string }[] = []

for (const { key } of DEAD_CATALOG_KEYS) {
  assert.ok(
    !allSite.includes(`"${key}"`) && !allSite.includes(`\`${key}\``) && !allSite.includes(`['${key}']`),
    `${key} appears on public — remove from DEAD_CATALOG_KEYS`,
  )
}

const hotFields = pageSettingsGroups.hot.groups.flatMap((g) => g.fields.map((f) => f.key))
assert.ok(!hotFields.includes("hot.title"), "#65: dead hot.title removed from pageSettingsGroups")
assert.ok(!hotFields.includes("hot.subtitle"), "#65: dead hot.subtitle removed from pageSettingsGroups")
assert.ok(hotFields.includes("hot.h1"), "pageSettingsGroups.hot uses hot.h1")
assert.ok(hotFields.includes("hot.intro"), "pageSettingsGroups.hot uses hot.intro")

// #64: legacy Egypt admin + dual-key bridge removed
assert.ok(!("aviatory-egipet" in pageSettingsGroups), "legacy Egypt admin pageSettingsGroups gone")
assert.ok(!aviaCountry.includes("fallbackPrefix"), "Egypt alert fallbackPrefix removed")

// Live hot editor path must not use dead keys
assert.match(hotPage, /const p = "hot"/)
assert.ok(hotPage.includes('get("h1")') || hotPage.includes(".h1"), "hot public uses h1 not title")
assert.ok(!hotPage.includes("hot.title") && !hotPage.includes('get("title")'), "hot must not read hot.title")

console.log(`cms-dead-keys.selfcheck: ok (${DEAD_CATALOG_KEYS.length} tracked dead catalog keys)`)
