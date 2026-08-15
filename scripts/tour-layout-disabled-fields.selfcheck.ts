/**
 * Tour-form layout-conditional fieldset wrapper:
 * When a section is removed from tour layout, it must not submit its stale
 * HTML controls. Native <fieldset disabled> achieves this without JS.
 *
 * Run: npx tsx scripts/tour-layout-disabled-fields.selfcheck.ts
 */
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

const root = path.join(import.meta.dirname, "..")
const tourForm = fs.readFileSync(
  path.join(root, "components/admin/tour-form.tsx"),
  "utf8",
)

// Section keys that are layout-conditional — their content is rendered via
// showSection() wrapped in a <fieldset disabled> wrapper so FormData skips it.
const layoutConditionalKeys = ["gallery", "included", "program", "documents", "faq", "dates"]

for (const key of layoutConditionalKeys) {
  assert.match(
    tourForm,
    new RegExp(`fieldset\\s+disabled=\\{!showSection\\("${key}"\\)\\}`),
    `tour-form wraps showSection("${key}") content in <fieldset disabled> so FormData skips hidden sections`,
  )
}

console.log("tour-layout-disabled-fields.selfcheck: ok")
