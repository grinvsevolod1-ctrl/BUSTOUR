/**
 * Tour layout: delete/hide/add parity with city PageSectionsManager.
 * Run: npx tsx scripts/tour-layout-sections.selfcheck.ts
 */
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import {
  defaultTourSections,
  resolveTourLayout,
  missingTourSections,
} from "@/lib/tour-sections"

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")

// missing → defaults; explicit empty remains intentionally empty
assert.deepEqual(
  resolveTourLayout(undefined).map((s) => s.key),
  defaultTourSections.map((s) => s.key),
)
assert.deepEqual(resolveTourLayout([]), [])

// non-empty stored layout keeps only listed keys (deleted stay out)
const withoutReviews = defaultTourSections.filter((s) => s.key !== "reviews")
const resolved = resolveTourLayout(withoutReviews)
assert.equal(resolved.some((s) => s.key === "reviews"), false)
assert.deepEqual(
  resolved.map((s) => s.key),
  withoutReviews.map((s) => s.key),
)

// missing catalog for "Добавить секцию"
const missing = missingTourSections(withoutReviews)
assert.equal(missing.length, 1)
assert.equal(missing[0]!.key, "reviews")

// admin builder UX parity with cities
const builder = fs.readFileSync(path.join(root, "components/admin/tour-layout-builder.tsx"), "utf8")
assert.ok(builder.includes("pickerOpen"), "add-section picker like cities")
assert.ok(builder.includes("Trash2") || builder.includes("Trash"), "delete section control")
assert.ok(builder.includes("EyeOff") || builder.includes("Eye"), "hide section control")

console.log("tour-layout-sections.selfcheck: ok")
