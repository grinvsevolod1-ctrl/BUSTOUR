/**
 * Bus detail: reorderable specs / documents / seating via page sections.order.
 * Run: npx tsx scripts/bus-layout.selfcheck.ts
 */
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { busPageConfig } from "@/lib/admin-config"
import { resolveInitialOrder } from "@/lib/section-order"
import { MULTIPLIABLE_SECTION_BASES } from "@/lib/section-registry"

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")

const page = busPageConfig("neoplan-122", "Neoplan 122")
const shortKeys = page.sections.map((s) => s.key.split(".section.")[1]!)
assert.ok(shortKeys.includes("specs"), "bus sections include specs")
assert.ok(shortKeys.includes("documents"), "bus sections include documents")
assert.ok(shortKeys.includes("seating"), "bus sections include seating")

const defaultOrder = ["specs", "documents", "seating", "seo", "resorts", "faq", "callus"]
assert.deepEqual(
  resolveInitialOrder(undefined, defaultOrder, shortKeys, [...MULTIPLIABLE_SECTION_BASES]),
  defaultOrder,
)

// Saved CMS-only order still accepts core keys when present in JSON
assert.deepEqual(
  resolveInitialOrder(
    JSON.stringify(["specs", "seating", "documents", "seo", "faq"]),
    defaultOrder,
    shortKeys,
    [...MULTIPLIABLE_SECTION_BASES],
  ),
  ["specs", "seating", "documents", "seo", "faq"],
)

const publicPage = fs.readFileSync(path.join(root, "app/(site)/bus-rental/[slug]/page.tsx"), "utf8")
assert.ok(publicPage.includes('key === "specs"'), "public renders specs from order")
assert.ok(publicPage.includes('key === "documents"'), "public renders documents from order")
assert.ok(publicPage.includes('key === "seating"'), "public renders seating from order")
assert.ok(!/TourDocuments documents=\{bus\.documents\}[\s\S]*BusOrderButton/.test(publicPage.replace(/\n/g, " ")), "docs no longer hardcoded before specs outside order")

const adminPage = fs.readFileSync(path.join(root, "app/admin/(protected)/buses/[id]/page.tsx"), "utf8")
assert.ok(adminPage.includes('"specs"'), "admin defaultOrder includes specs")
assert.ok(adminPage.includes('"documents"'), "admin defaultOrder includes documents")
assert.ok(adminPage.includes('"seating"'), "admin defaultOrder includes seating")

const schema = fs.readFileSync(path.join(root, "lib/db/schema.ts"), "utf8")
assert.ok(schema.includes('seating: text("seating")'), "buses.seating column in schema")

const baselineMigration = fs.readFileSync(path.join(root, "drizzle/0000_talented_psylocke.sql"), "utf8")
assert.ok(baselineMigration.includes('"seating" text'), "versioned baseline creates seating")

const form = fs.readFileSync(path.join(root, "components/admin/bus-base-form.tsx"), "utf8")
assert.ok(form.includes('name="seating"'), "bus form saves seating field")
assert.ok(form.includes('name="documents"'), "bus form saves documents field")

console.log("bus-layout.selfcheck: ok")
