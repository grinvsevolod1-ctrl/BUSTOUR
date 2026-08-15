/**
 * #33 thin: section registry is source of allowMultiple for admin + resolveInitialOrder.
 * Run: npx tsx scripts/section-registry.selfcheck.ts
 */
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import {
  SECTION_REGISTRY,
  MULTIPLIABLE_SECTION_BASES,
  isMultipliableSectionBase,
  getSectionDef,
} from "@/lib/section-registry"
import { resolveInitialOrder } from "@/lib/section-order"

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const read = (rel: string) => fs.readFileSync(path.join(root, rel), "utf8")

const ids = SECTION_REGISTRY.map((s) => s.id)
assert.equal(new Set(ids).size, ids.length, "registry ids unique")

const multi = SECTION_REGISTRY.filter((s) => s.allowMultiple).map((s) => s.id)
assert.deepEqual([...MULTIPLIABLE_SECTION_BASES].sort(), [...multi].sort())
for (const id of multi) {
  assert.ok(isMultipliableSectionBase(id), `${id} isMultipliable`)
  assert.ok(getSectionDef(id)?.allowMultiple, `${id} def.allowMultiple`)
}
assert.ok(!isMultipliableSectionBase("cities"))

assert.deepEqual(
  resolveInitialOrder(
    JSON.stringify(["cities", "seo", "seo2", "callus3", "faq"]),
    ["cities", "seo", "faq", "callus"],
    ["cities", "seo", "faq", "callus"],
  ),
  ["cities", "seo", "seo2", "callus3", "faq"],
)

const mgr = read("components/admin/page-sections-manager.tsx")
assert.ok(mgr.includes("isMultipliableSectionBase"), "admin picker reads registry helper")

for (const rel of [
  "app/admin/(protected)/cities/[id]/page.tsx",
  "app/admin/(protected)/countries/[id]/page.tsx",
]) {
  const src = read(rel)
  assert.ok(!src.includes("MULTIPLIABLE_BASES = ["), `${rel}: no local MULTIPLIABLE_BASES`)
  assert.ok(!src.includes('["seo", "resorts", "faq", "callus"]'), `${rel}: no hard-coded multi list`)
}

const multipliable = read("lib/multipliable-sections.ts")
assert.ok(
  multipliable.includes('from "@/lib/section-registry"'),
  "multipliable-sections re-exports registry",
)

console.log("section-registry.selfcheck: ok")
