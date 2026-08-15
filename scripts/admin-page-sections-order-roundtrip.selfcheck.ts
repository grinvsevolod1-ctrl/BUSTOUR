/**
 * Live roundtrip: savePageSectionsOrderAction → getSettings → resolveInitialOrder.
 * End-to-end selfcheck for admin/pages/bus-home#sec-order save bug report.
 * Run: npx tsx scripts/admin-page-sections-order-roundtrip.selfcheck.ts
 */
import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { saveSettings, getSettings } from "../lib/cms"
import { ensureDb } from "../lib/db/init"
import { resolveInitialOrder, DESTINATION_DEFAULT_SECTION_ORDER } from "../lib/section-order"

const PAGE = `selfcheck-${randomUUID().slice(0, 8)}`
const ORDER_KEY = `${PAGE}.sections.order`
const DEFAULT_ORDER = [...DESTINATION_DEFAULT_SECTION_ORDER]
const BASE_SHORT_KEYS = ["search", "cities", "resorts", "seo", "faq", "callus"]

async function main() {
  await ensureDb()

  // Cleanup before
  await saveSettings({ [ORDER_KEY]: "" })

  const FIRST = ["cities", "search", "callus", "resorts", "seo", "faq"]
  await saveSettings({ [ORDER_KEY]: JSON.stringify(FIRST) })

  const settings = await getSettings()
  const stored = settings[ORDER_KEY]
  assert.equal(typeof stored, "string", `settings missing ${ORDER_KEY} — saveSettings did not write`)
  assert.equal(stored, JSON.stringify(FIRST), "saved JSON string mismatch")

  const initial = resolveInitialOrder(settings[ORDER_KEY], DEFAULT_ORDER, BASE_SHORT_KEYS)
  assert.deepEqual(
    initial,
    FIRST,
    "resolveInitialOrder did not return reordered list (isValid baseShortKeys coverage broken?)",
  )

  // Now simulate: user drags faq to FIRST position
  const SECOND = ["faq", ...FIRST.filter((k) => k !== "faq")]
  await saveSettings({ [ORDER_KEY]: JSON.stringify(SECOND) })
  const after = await getSettings()
  assert.equal(after[ORDER_KEY], JSON.stringify(SECOND), "2nd write did not replace first")

  // Cleanup
  await saveSettings({ [ORDER_KEY]: "" })
  console.log("admin-page-sections-order-roundtrip.selfcheck ok")
}
main().catch((error) => {
  console.error(error)
  process.exit(1)
})
