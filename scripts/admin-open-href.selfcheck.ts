/**
 * Admin «Открыть» must use public routes — never corrupted CMS slugs
 * (hot.slug=hot-4) and never the internal /aviatory folder name.
 *
 * Run: npx tsx scripts/admin-open-href.selfcheck.ts
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import {
  aviaCityPageConfig,
  aviaCountryPageConfig,
  aviaHomePageConfig,
  busHomePageConfig,
  hotCountryPageConfig,
  hotHomePageConfig,
  pageSettingsGroups,
} from "../lib/admin-config"
import {
  adminAviaHomeHref,
  adminBusHomeHref,
  adminCityOpenHref,
  adminCountryOpenHref,
  adminHotHomeHref,
  branchPublicPrefix,
} from "../lib/admin-public-href"
import { resolveHotPublicHref } from "../lib/hot-slug"

const root = process.cwd()
const read = (rel: string) => readFileSync(join(root, rel), "utf8")

// --- Resolvers: hot always /hot/ ---
assert.equal(adminHotHomeHref(undefined), "/hot/")
assert.equal(adminHotHomeHref("hot-4"), "/hot/")
assert.equal(adminHotHomeHref("  HOT-4  "), "/hot/")
assert.equal(resolveHotPublicHref("something-else"), "/hot/")
assert.equal(hotHomePageConfig().url, "/hot/")
assert.equal(pageSettingsGroups.hot.url, "/hot/")

// --- Resolvers: avia uses public prefix (default aviatury) ---
assert.equal(adminAviaHomeHref(undefined), "/aviatury/")
assert.equal(adminAviaHomeHref(""), "/aviatury/")
assert.equal(adminAviaHomeHref("aviatory"), "/aviatury/")
assert.equal(adminAviaHomeHref("custom-avia"), "/custom-avia/")
assert.equal(aviaHomePageConfig().url, "/aviatury/")
assert.ok(!("aviatory-egipet" in pageSettingsGroups), "legacy Egypt admin group removed")

assert.equal(adminBusHomeHref(), "/avtobusnye-tury/")
assert.equal(busHomePageConfig().url, "/avtobusnye-tury/")

// --- Branch prefixes ---
assert.equal(branchPublicPrefix("hot"), "hot")
assert.equal(branchPublicPrefix("bus"), "avtobusnye-tury")
assert.equal(branchPublicPrefix("avia", undefined), "aviatury")
assert.equal(branchPublicPrefix("avia", "aviatory"), "aviatury")
assert.equal(branchPublicPrefix("avia", "my-avia"), "my-avia")

// --- Country / city open hrefs ---
assert.equal(
  adminCountryOpenHref({ category: "hot", countrySlug: "turciya" }),
  "/hot/turciya/",
)
assert.equal(
  adminCountryOpenHref({ category: "bus", countrySlug: "rossiya" }),
  "/avtobusnye-tury/rossiya/",
)
assert.equal(
  adminCountryOpenHref({
    category: "avia",
    countrySlug: "egipet",
    aviaSlugRaw: "aviatory",
  }),
  "/aviatury/egipet/",
)
assert.equal(
  adminCountryOpenHref({
    category: "avia",
    countrySlug: "egipet",
    aviaSlugRaw: "aviatory",
    pageSlugOverride: "all-egipet",
  }),
  "/aviatury/all-egipet/",
)
// pageSlugOverride must not affect hot/bus
assert.equal(
  adminCountryOpenHref({
    category: "hot",
    countrySlug: "turciya",
    pageSlugOverride: "hot-4",
  }),
  "/hot/turciya/",
)

assert.equal(
  adminCityOpenHref({
    category: "hot",
    countrySlug: "turciya",
    citySlug: "antalya",
  }),
  "/hot/turciya/antalya/",
)
assert.equal(
  adminCityOpenHref({
    category: "avia",
    countrySlug: "egipet",
    citySlug: "hurgada",
    aviaSlugRaw: undefined,
  }),
  "/aviatury/egipet/hurgada/",
)
assert.equal(
  adminCityOpenHref({
    category: "bus",
    countrySlug: "_",
    citySlug: "minsk",
  }),
  "/avtobusnye-tury/_/minsk/",
)

assert.equal(hotCountryPageConfig("turciya").url, "/hot/turciya/")
assert.equal(aviaCountryPageConfig("egipet").url, "/aviatury/egipet/")
assert.equal(aviaCityPageConfig("hurgada").url, "/aviatury/_/hurgada/")

// --- Static CMS pages: hardcoded public urls ---
assert.equal(pageSettingsGroups.home.url, "/")
assert.equal(pageSettingsGroups.company.url, "/company")
assert.equal(pageSettingsGroups.rental.url, "/bus-rental")
assert.equal(pageSettingsGroups.dictionary.url, "/info/dictionary")

// --- Source guards: no pageHref from settings hot.slug / raw /aviatory ---
const hotAdmin = read("app/admin/(protected)/pages/hot/page.tsx")
assert.match(hotAdmin, /resolveHotPublicHref|adminHotHomeHref/)
assert.doesNotMatch(hotAdmin, /pageHref=\{`\/\$\{slug\}\/`\}/)

const aviaHome = read("app/admin/(protected)/pages/aviatory-home/page.tsx")
assert.match(aviaHome, /adminAviaHomeHref/)
assert.doesNotMatch(aviaHome, /pageHref=\{`\/\$\{slug\}\/`\}/)

const busHome = read("app/admin/(protected)/pages/bus-home/page.tsx")
assert.match(busHome, /pageHref="\/avtobusnye-tury\/"/)

const countriesList = read("app/admin/(protected)/countries/page.tsx")
assert.match(countriesList, /adminCountryOpenHref/)
assert.doesNotMatch(countriesList, /avia:\s*"aviatory"/)

const citiesList = read("app/admin/(protected)/cities/page.tsx")
assert.match(citiesList, /adminCityOpenHref/)
assert.doesNotMatch(citiesList, /avia:\s*"aviatory"/)

const countryEdit = read("app/admin/(protected)/countries/[id]/page.tsx")
assert.match(countryEdit, /adminCountryOpenHref/)
assert.doesNotMatch(countryEdit, /pageHref=\{page\.url\}/)

const cityEdit = read("app/admin/(protected)/cities/[id]/page.tsx")
assert.match(cityEdit, /adminCityOpenHref/)
assert.doesNotMatch(cityEdit, /`\/aviatory\/\$\{countrySlug\}/)

const articlesList = read("app/admin/(protected)/articles/page.tsx")
assert.match(articlesList, /articleUrl\(/)
assert.doesNotMatch(articlesList, /`\/info\/\$\{article\.slug\}`/)

const articleEdit = read("app/admin/(protected)/articles/[id]/page.tsx")
assert.match(articleEdit, /articleUrl\(/)
assert.doesNotMatch(articleEdit, /pageHref=\{`\/info\/\$\{article\.slug\}`\}/)

const hrefLib = read("lib/admin-public-href.ts")
assert.match(hrefLib, /resolveHotPublicHref/)
assert.match(hrefLib, /resolveAviaSlug/)

console.log("admin-open-href.selfcheck ok")
