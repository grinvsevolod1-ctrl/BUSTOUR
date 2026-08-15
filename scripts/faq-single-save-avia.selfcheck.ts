/**
 * FAQ admin single-save + avia public page scope.
 * Run: npx tsx scripts/faq-single-save-avia.selfcheck.ts
 */
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { buildFaqFormIds, pageFaqFormId } from "@/lib/faq-slots"

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")

{
  const ids = buildFaqFormIds("aviatory", ["cities", "faq", "callus"])
  assert.ok(ids.includes(pageFaqFormId("aviatory", "faq")))
  assert.ok(!ids.includes("page-faq-form-aviatory"), "legacy id without slot must not be the only target")
}

const faqForm = fs.readFileSync(path.join(root, "components/admin/page-faq-form.tsx"), "utf8")
assert.ok(!faqForm.includes("Сохранить FAQ"), "no local FAQ save button — header Save only")
assert.ok(faqForm.includes("formId"), "portal form still wires fields")

const aviaAdmin = fs.readFileSync(
  path.join(root, "app/admin/(protected)/pages/aviatory-home/page.tsx"),
  "utf8",
)
assert.ok(aviaAdmin.includes("buildFaqFormIds"), "avia admin uses buildFaqFormIds")
assert.ok(!/extraFormIds=\{\[`page-faq-form-\$\{pageKey/.test(aviaAdmin), "no bare page-faq-form id")

const aviaPublic = fs.readFileSync(path.join(root, "app/(site)/aviatory/page.tsx"), "utf8")
assert.ok(aviaPublic.includes("getFaqBlocksForPage"), "public avia uses page-scoped FAQ")
assert.ok(
  aviaPublic.includes("OrderedFaqSection") || aviaPublic.includes("DestinationSectionMap"),
  "public avia uses ordered FAQ sections",
)
assert.ok(aviaPublic.includes('getFaqs("category:avia")'), "legacy category:avia fallback kept")
assert.ok(aviaPublic.includes("faqBlocksFromPage.length"), "page FAQ preferred over legacy")
assert.ok(!aviaPublic.includes("page.tours.faq"), "no legacy page.tours.faq toggle")

for (const rel of ["app/admin/(protected)/pages/bus-home/page.tsx"]) {
  const src = fs.readFileSync(path.join(root, rel), "utf8")
  assert.ok(src.includes("buildFaqFormIds"), `${rel} must use buildFaqFormIds`)
}

console.log("faq-single-save-avia.selfcheck: ok")
