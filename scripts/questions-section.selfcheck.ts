/**
 * #29: «Есть вопросы?» (callus) is a movable CMS page section.
 * Default = 4th (before FAQ); admin + public share DESTINATION_DEFAULT_SECTION_ORDER.
 * Run: npx tsx scripts/questions-section.selfcheck.ts
 */
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import {
  DESTINATION_DEFAULT_SECTION_ORDER,
  destinationSectionOrder,
  resolveInitialOrder,
} from "@/lib/section-order"
import { MULTIPLIABLE_SECTION_BASES } from "@/lib/multipliable-sections"

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const read = (rel: string) => fs.readFileSync(path.join(root, rel), "utf8")

assert.deepEqual([...DESTINATION_DEFAULT_SECTION_ORDER], [
  "search",
  "cities",
  "resorts",
  "seo",
  "callus",
  "faq",
])
assert.equal(DESTINATION_DEFAULT_SECTION_ORDER[0], "search", "search/listing must be first")
assert.equal(DESTINATION_DEFAULT_SECTION_ORDER.indexOf("callus"), 4, "callus must be before FAQ")
assert.ok(MULTIPLIABLE_SECTION_BASES.includes("callus"), "callus multipliable for Add section")
assert.deepEqual(destinationSectionOrder(["seo", "search", "faq"]), ["search", "seo", "faq"])
assert.deepEqual(destinationSectionOrder(["seo", "faq"]), ["search", "seo", "faq"])

assert.deepEqual(
  resolveInitialOrder(undefined, [...DESTINATION_DEFAULT_SECTION_ORDER], [
    "search",
    "cities",
    "resorts",
    "seo",
    "faq",
    "callus",
  ]),
  ["search", "cities", "resorts", "seo", "callus", "faq"],
)
assert.deepEqual(
  resolveInitialOrder(JSON.stringify(["seo", "faq"]), [...DESTINATION_DEFAULT_SECTION_ORDER], [
    "search",
    "cities",
    "resorts",
    "seo",
    "faq",
    "callus",
  ]),
  ["seo", "faq"],
)

const cityAdmin = read("app/admin/(protected)/cities/[id]/page.tsx")
assert.ok(cityAdmin.includes("DESTINATION_DEFAULT_SECTION_ORDER"), "city admin uses shared default")
assert.ok(cityAdmin.includes('callus:'), "city admin has callus slot")

const countryAdmin = read("app/admin/(protected)/countries/[id]/page.tsx")
assert.ok(countryAdmin.includes("DESTINATION_DEFAULT_SECTION_ORDER"), "country admin uses shared default")

const mgr = read("components/admin/page-sections-manager.tsx")
assert.ok(mgr.includes('"callus"'), "manager mockup for callus")
assert.ok(mgr.includes("Добавить секцию"), "recovery via Add section")
assert.ok(mgr.includes("isMultipliableSectionBase"), "multipliable picker uses registry helper")

const configs = [
  "lib/admin-config.ts",
]
for (const rel of configs) {
  const src = read(rel)
  assert.ok(src.includes('label: "«Есть вопросы?»"') || src.includes("Есть вопросы"), `${rel}: callus labeled`)
  assert.ok(/\.section\.callus/.test(src), `${rel}: section.callus keys registered`)
}

const publicPages = [
  "app/(site)/hot/[countrySlug]/[citySlug]/page.tsx",
  "app/(site)/aviatory/[countrySlug]/[citySlug]/page.tsx",
  "app/(site)/avtobusnye-tury/[countrySlug]/[citySlug]/page.tsx",
  "app/(site)/hot/page.tsx",
  "app/(site)/aviatory/page.tsx",
  "app/(site)/avtobusnye-tury/page.tsx",
  "app/(site)/hot/[countrySlug]/page.tsx",
  "app/(site)/avtobusnye-tury/[countrySlug]/page.tsx",
]
for (const rel of publicPages) {
  const src = read(rel)
  assert.ok(src.includes("DESTINATION_DEFAULT_SECTION_ORDER"), `${rel}: shared default fallback`)
  assert.ok(
    src.includes("OrderedCallUs") ||
      src.includes("isCallusSectionKey") ||
      src.includes("DestinationSectionMap"),
    `${rel}: renders callus in order`,
  )
  assert.ok(!src.includes('["cities", "resorts", "seo", "faq", "callus"]'), `${rel}: no old faq-before-callus literal`)
}

console.log("questions-section.selfcheck: ok")
