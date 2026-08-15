/**
 * Full alert surface coverage: PageAlert mounts + prefix wiring + tour/dates Alert.
 *
 * Run: npx tsx scripts/page-alert-coverage.selfcheck.ts
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import {
  pageAlertFields,
  pageSettingsGroups,
} from "@/lib/admin-config"

const site = join(process.cwd(), "app", "(site)")
const components = join(process.cwd(), "components")

function readSite(rel: string) {
  return readFileSync(join(site, rel), "utf8")
}

function readComp(rel: string) {
  return readFileSync(join(components, rel), "utf8")
}

/** Catalog pages: file → expected prefix string literal or variable binding for PageAlert. */
const PAGE_ALERTS: {
  file: string
  /** Literal prefix= "…" or proof that `p` is bound to this CMS prefix. */
  expect: RegExp
  note: string
}[] = [
  { file: "aviatory/page.tsx", expect: /prefix=\{p\}/, note: "avia home" },
  {
    file: "aviatory/[countrySlug]/page.tsx",
    expect: /prefix=\{p\}/,
    note: "avia country",
  },
  { file: "aviatory/[countrySlug]/[citySlug]/page.tsx", expect: /prefix=\{p\}/, note: "avia city" },
  { file: "avtobusnye-tury/page.tsx", expect: /prefix=\{p\}/, note: "bus home" },
  { file: "avtobusnye-tury/[countrySlug]/page.tsx", expect: /prefix=\{p\}/, note: "bus country" },
  {
    file: "avtobusnye-tury/[countrySlug]/[citySlug]/page.tsx",
    expect: /prefix=\{p\}/,
    note: "bus city",
  },
  { file: "hot/page.tsx", expect: /prefix=\{p\}/, note: "hot home" },
  { file: "hot/[countrySlug]/page.tsx", expect: /prefix=\{p\}/, note: "hot country" },
  { file: "hot/[countrySlug]/[citySlug]/page.tsx", expect: /prefix=\{p\}/, note: "hot city" },
  { file: "bus-rental/page.tsx", expect: /prefix="rental"/, note: "rental" },
]

for (const { file, expect, note } of PAGE_ALERTS) {
  const src = readSite(file)
  assert.match(src, /<PageAlert\b/, `missing <PageAlert> on ${file} (${note})`)
  assert.match(src, /from ["']@\/components\/site\/alert["']/, `missing alert import on ${file}`)
  assert.match(src, expect, `PageAlert wiring mismatch on ${file} (${note})`)
  // Same vertical rhythm as /hot: PageAlert sits in a space-y-4 stack with h1/intro.
  assert.match(
    src,
    /space-y-4[\s\S]{0,800}<PageAlert\b/,
    `PageAlert must be inside space-y-4 (like /hot) on ${file} (${note})`,
  )
}

// Prefix bindings for variable `p` (PAGE_KEY or literal)
{
  const aviaHome = readSite("aviatory/page.tsx")
  assert.match(aviaHome, /PAGE_KEY\s*=\s*"aviatory"/)
  assert.match(aviaHome, /const p = PAGE_KEY/)
}
{
  const busHome = readSite("avtobusnye-tury/page.tsx")
  assert.match(busHome, /PAGE_KEY\s*=\s*"bustours"/)
  assert.match(busHome, /const p = PAGE_KEY/)
}
assert.match(readSite("hot/page.tsx"), /const p = "hot"/)
assert.match(readSite("aviatory/[countrySlug]/page.tsx"), /const p = `country:avia:\$\{/)
assert.match(readSite("aviatory/[countrySlug]/[citySlug]/page.tsx"), /const p = `city:avia:\$\{/)
assert.match(readSite("avtobusnye-tury/[countrySlug]/page.tsx"), /const p = `country:bus:\$\{/)
assert.match(
  readSite("avtobusnye-tury/[countrySlug]/[citySlug]/page.tsx"),
  /const p = `city:bus:\$\{/,
)
assert.match(readSite("hot/[countrySlug]/page.tsx"), /const p = `country:hot:\$\{/)
assert.match(readSite("hot/[countrySlug]/[citySlug]/page.tsx"), /const p = `city:hot:\$\{/)

// Tour + dates-table alerts
const tourPage = readComp("site/tour-page-content.tsx")
assert.match(tourPage, /<Alert\b/, "tour detail must render <Alert>")
assert.match(tourPage, /alertText/, "tour detail must pass alertText")
assert.match(
  tourPage,
  /space-y-4[\s\S]{0,400}<Alert\b/,
  "tour detail Alert must sit in space-y-4 like catalog PageAlert",
)
const datesTable = readComp("site/dates-table.tsx")
assert.match(datesTable, /<Alert\b/, "dates table must render <Alert> for note")
assert.match(datesTable, /noteType|data\.note/, "dates table must use note / noteType")

const tourForm = readComp("admin/tour-form.tsx")
assert.match(tourForm, /pageAlertFields\(""\)/, "tour form must expose bare alert fields")

// Admin configs that expose pageAlertFields must map to a public mount (inventory)
assert.equal(pageAlertFields("aviatory")[0].key, "aviatory.alertText")
assert.equal(pageAlertFields("bustours")[0].key, "bustours.alertText")
assert.equal(pageAlertFields("bustours")[0].type, "shortcode-textarea-multiline")
assert.equal(pageAlertFields("hot")[0].key, "hot.alertText")
assert.equal(pageAlertFields("rental")[0].key, "rental.alertText")
assert.equal(pageAlertFields("rental")[0].type, "shortcode-textarea-multiline")
assert.ok(!("aviatory-egipet" in pageSettingsGroups), "legacy egipet admin page removed")
assert.ok(
  pageSettingsGroups.rental.groups.some((g) =>
    g.fields.some((f) => f.key === "rental.alertText"),
  ),
  "rental admin must expose alertText",
)

// Role mapping stays in Alert component
const alertSrc = readComp("site/alert.tsx")
assert.match(alertSrc, /role=\{kind === "warning" \? "alert" : "status"\}/)
assert.match(alertSrc, /resolvePageAlert/)

console.log(`page-alert-coverage.selfcheck: ok (${PAGE_ALERTS.length} pages + tour/dates)`)
