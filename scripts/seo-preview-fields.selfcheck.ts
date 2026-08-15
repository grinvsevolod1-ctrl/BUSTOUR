/**
 * SEO description + social preview pair must stay together with editor hints.
 * Run: npx tsx scripts/seo-preview-fields.selfcheck.ts
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import {
  SEO_META_DESCRIPTION_HINT,
  SEO_META_DESCRIPTION_LABEL,
  SEO_META_SHORT_DESC_HINT,
  SEO_META_SHORT_DESC_LABEL,
  aviaCityPageConfig,
  aviaCountryPageConfig,
  aviaHomePageConfig,
  busHomePageConfig,
  busPageConfig,
  hotCityPageConfig,
  hotCountryPageConfig,
  hotHomePageConfig,
  pageSettingsGroups,
  seoPreviewDescriptionFields,
} from "@/lib/admin-config"
import { legalSettingKeys } from "@/lib/legal-pages"

const pair = seoPreviewDescriptionFields("demo")
assert.equal(pair.length, 2)
assert.equal(pair[0].key, "demo.metaDescription")
assert.equal(pair[1].key, "demo.metaShortDesc")
assert.equal(pair[0].label, SEO_META_DESCRIPTION_LABEL)
assert.equal(pair[1].label, SEO_META_SHORT_DESC_LABEL)
assert.ok((pair[0].hint ?? "").length > 20)
assert.ok((pair[1].hint ?? "").length > 20)
assert.equal(pair[0].hint, SEO_META_DESCRIPTION_HINT)
assert.equal(pair[1].hint, SEO_META_SHORT_DESC_HINT)

const bare = seoPreviewDescriptionFields("")
assert.equal(bare[0].key, "metaDescription")
assert.equal(bare[1].key, "metaShortDesc")

const required = seoPreviewDescriptionFields("x", { required: true })
assert.equal(required[0].required, true)
assert.equal(required[1].required, true)

function assertPaired(fields: { key: string }[], where: string) {
  const keys = fields.map((f) => f.key)
  const descs = keys.filter((k) => k.endsWith(".metaDescription") || k === "metaDescription")
  const shorts = keys.filter((k) => k.endsWith(".metaShortDesc") || k === "metaShortDesc")
  for (const d of descs) {
    const short = d.replace(/metaDescription$/, "metaShortDesc")
    assert.ok(keys.includes(short), `${where}: ${d} without ${short}`)
  }
  for (const sh of shorts) {
    const d = sh.replace(/metaShortDesc$/, "metaDescription")
    assert.ok(keys.includes(d), `${where}: ${sh} without ${d}`)
  }
}

for (const [slug, page] of Object.entries(pageSettingsGroups)) {
  for (const g of page.groups) {
    assertPaired(g.fields, `pageSettingsGroups.${slug}/${g.heading}`)
  }
}

const configs = [
  ["aviaHome", aviaHomePageConfig()],
  ["busHome", busHomePageConfig()],
  ["hotHome", hotHomePageConfig()],
  ["aviaCountry", aviaCountryPageConfig("demo")],
  ["busCountry", aviaCountryPageConfig("demo", undefined, "bus")],
  ["hotCountry", hotCountryPageConfig("demo")],
  ["aviaCity", aviaCityPageConfig("demo")],
  ["busCity", aviaCityPageConfig("demo", undefined, "bus")],
  ["hotCity", hotCityPageConfig("demo")],
  ["busDetail", busPageConfig("demo-bus")],
]

for (const [name, cfg] of configs) {
  for (const g of cfg.groups) {
    assertPaired(g.fields, `${name}/${g.heading}`)
  }
}

const legalKeys = legalSettingKeys("privacy")
assert.equal(legalKeys.metaDescription, "privacy.metaDescription")
assert.equal(legalKeys.metaShortDesc, "privacy.metaShortDesc")

const legalPage = readFileSync(
  join(process.cwd(), "app", "admin", "(protected)", "pages", "legal", "page.tsx"),
  "utf8",
)
assert.match(legalPage, /seoPreviewDescriptionFields\(/)
assert.ok(!legalPage.includes('label: "Meta description"'))

const tourForm = readFileSync(join(process.cwd(), "components", "admin", "tour-form.tsx"), "utf8")
assert.match(tourForm, /name="metaDescription"/)
assert.match(tourForm, /name="metaShortDesc"/)
assert.match(tourForm, /SEO_META_DESCRIPTION_HINT/)
assert.match(tourForm, /SEO_META_SHORT_DESC_HINT/)
assert.match(tourForm, /SEO_META_DESCRIPTION_LABEL/)
assert.match(tourForm, /SEO_META_SHORT_DESC_LABEL/)

const articleForm = readFileSync(join(process.cwd(), "components", "admin", "article-form.tsx"), "utf8")
assert.match(articleForm, /name="metaDescription"/)
assert.match(articleForm, /name="metaShortDesc"/)
assert.match(articleForm, /SEO_META_DESCRIPTION_HINT/)
assert.match(articleForm, /SEO_META_SHORT_DESC_HINT/)

const adminConfig = readFileSync(join(process.cwd(), "lib", "admin-config.ts"), "utf8")
assert.ok(!adminConfig.includes('label: "Meta description"'), "stale Meta description labels remain in admin-config")
assert.ok(!adminConfig.includes('label: "Превью описание"'), "stale Превью описание labels remain in admin-config")

console.log("seo-preview-fields.selfcheck: ok")
