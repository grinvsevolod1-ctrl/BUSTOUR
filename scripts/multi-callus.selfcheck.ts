/**
 * Multi callus: allow callus/callus2 in admin picker + public render.
 * Run: npx tsx scripts/multi-callus.selfcheck.ts
 */
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import {
  MULTIPLIABLE_SECTION_BASES,
  isCallusSectionKey,
  callusSlotsFromOrder,
  sectionBaseKey,
} from "@/lib/multipliable-sections"
import { resolveInitialOrder } from "@/lib/section-order"

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")

assert.ok(MULTIPLIABLE_SECTION_BASES.includes("callus"))
assert.ok(isCallusSectionKey("callus"))
assert.ok(isCallusSectionKey("callus2"))
assert.ok(!isCallusSectionKey("faq2"))
assert.equal(sectionBaseKey("callus3"), "callus")
assert.deepEqual(callusSlotsFromOrder(["seo", "callus", "faq", "callus2"]), ["callus", "callus2"])

assert.deepEqual(
  resolveInitialOrder(JSON.stringify(["cities", "callus", "callus2", "faq"]), ["cities", "faq", "callus"], ["cities", "faq", "callus"], [
    ...MULTIPLIABLE_SECTION_BASES,
  ]),
  ["cities", "callus", "callus2", "faq"],
)

const mgr = fs.readFileSync(path.join(root, "components/admin/page-sections-manager.tsx"), "utf8")
assert.ok(mgr.includes("isMultipliableSectionBase"), "manager uses registry allowMultiple helper")
assert.ok(mgr.includes('sectionBaseKey(shortKey) === "callus"'), "callus2+ reuses callus slot note")

const hotPublic = fs.readFileSync(path.join(root, "app/(site)/hot/page.tsx"), "utf8")
assert.ok(
  hotPublic.includes("OrderedCallUs") || hotPublic.includes("DestinationSectionMap"),
  "hot public uses OrderedCallUs",
)
assert.ok(
  hotPublic.includes("isCallusSectionKey") || hotPublic.includes("DestinationSectionMap"),
  "hot public matches numbered callus",
)
const destMap = fs.readFileSync(
  path.join(root, "components/site/catalog/destination-section-map.tsx"),
  "utf8",
)
assert.ok(destMap.includes("OrderedCallUs") && destMap.includes("isCallusSectionKey"), "map: callus")

const citiesAdmin = fs.readFileSync(path.join(root, "app/admin/(protected)/cities/[id]/page.tsx"), "utf8")
assert.ok(citiesAdmin.includes("callus"), "cities admin still has callus slot")
assert.ok(!citiesAdmin.includes("MULTIPLIABLE_BASES = ["), "cities uses registry default multipliable")

console.log("multi-callus.selfcheck: ok")
