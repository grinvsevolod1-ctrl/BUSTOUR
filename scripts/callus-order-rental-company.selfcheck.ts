/**
 * #45 / #50: rental+company honor section order for callus/faq;
 * single bus card has max-width.
 * Run: npx tsx scripts/callus-order-rental-company.selfcheck.ts
 */
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const read = (rel: string) => fs.readFileSync(path.join(root, rel), "utf8")

const rental = read("app/(site)/bus-rental/page.tsx")
assert.ok(rental.includes("OrderedCallUs"), "rental: OrderedCallUs in section order")
assert.ok(rental.includes("OrderedFaqSection"), "rental: OrderedFaqSection in section order")
assert.ok(rental.includes("isCallusSectionKey"), "rental: matches numbered callus")
assert.ok(!rental.includes("PageExtras"), "rental: no PageExtras dump at bottom")
assert.ok(/max-w-\[400px\]/.test(rental), "rental: bus card max-width (#50)")
assert.ok(rental.includes("flex-1"), "rental: still flex for multi-card grid")

const company = read("app/(site)/company/page.tsx")
assert.ok(company.includes("OrderedCallUs"), "company: OrderedCallUs in section order")
assert.ok(company.includes("OrderedFaqSection"), "company: OrderedFaqSection in section order")
assert.ok(company.includes("company.sections.order"), "company: reads saved order")
assert.ok(!company.includes("PageExtras"), "company: no PageExtras dump at bottom")

const extras = read("components/site/page-extras.tsx")
assert.ok(extras.includes("sections.order"), "PageExtras: respects sectionPrefix order")
assert.ok(extras.includes('type: "callus"') || extras.includes('type: "faq"'), "PageExtras: ordered bands")

console.log("callus-order-rental-company.selfcheck: ok")
