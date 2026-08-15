/**
 * #P3-aug12: PageSectionsManager — section reorder + toggle visibility autotest.
 * Run: npx tsx scripts/page-sections-order-visibility.selfcheck.ts
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import {
  draftStoresSizeForTest,
  getDraftStoreForTest,
  releaseDraftStore,
  patchDraftForTest,
} from "../components/admin/page-sections-manager"

const root = process.cwd()
const src = readFileSync(join(root, "components/admin/page-sections-manager.tsx"), "utf8")

assert.ok(src.includes("patchDraft(store, { order: next })"), "move up/down uses patchDraft(order) via setOrder")
assert.ok(/patchDraft\(store,\s*\{\s*visibility:/.test(src), "eye-toggle uses patchDraft(visibility) via setVisibility")
assert.ok(src.includes("ChevronUp") && src.includes("ChevronDown"), "reorder buttons rendered")
assert.ok(src.includes("Eye, EyeOff"), "visibility toggle icons rendered")

const storeId = `selfcheck-order-vis::${Date.now()}`
const initialOrder = ["search", "resorts", "faq", "callus", "seo"]
const before = draftStoresSizeForTest()

const store = getDraftStoreForTest(storeId, "city:bus:1", initialOrder, {
  "city:bus:1.section.faq": "1",
  "city:bus:1.section.callus": "0",
})
assert.equal(draftStoresSizeForTest(), before + 1)
assert.deepEqual(store.snap.order, initialOrder, "initial order preserved")
assert.equal(store.snap.visibility["city:bus:1.section.callus"], false, "callus starts OFF (settings=0)")
assert.equal(store.snap.visibility["city:bus:1.section.faq"], true, "faq starts ON (settings=1)")

const rev0 = store.snap.rev

function moveUp(arr: string[], key: string) {
  const i = arr.indexOf(key)
  if (i <= 0) return arr
  const next = [...arr]
  ;[next[i - 1], next[i]] = [next[i], next[i - 1]]
  return next
}
function moveDown(arr: string[], key: string) {
  const i = arr.indexOf(key)
  if (i < 0 || i >= arr.length - 1) return arr
  const next = [...arr]
  ;[next[i], next[i + 1]] = [next[i + 1], next[i]]
  return next
}

patchDraftForTest(store, { order: moveUp(initialOrder, "faq") })
assert.equal(store.snap.rev, rev0 + 1, "rev increments on order patch")
assert.deepEqual(store.snap.order, ["search", "faq", "resorts", "callus", "seo"], "faq moved UP over resorts")

patchDraftForTest(store, { order: moveDown(store.snap.order, "search") })
assert.deepEqual(store.snap.order, ["faq", "search", "resorts", "callus", "seo"], "search moved DOWN over faq (undo faq-up)")

patchDraftForTest(store, { order: moveDown(store.snap.order, "seo") })
assert.deepEqual(store.snap.order, ["faq", "search", "resorts", "callus", "seo"], "seo stays last, down is no-op")

const orderRev = store.snap.rev
patchDraftForTest(store, {
  visibility: { ...store.snap.visibility, "city:bus:1.section.faq": false },
})
assert.equal(store.snap.rev, orderRev + 1, "rev increments on visibility patch")
assert.equal(store.snap.visibility["city:bus:1.section.faq"], false, "faq turned OFF via eye toggle")

patchDraftForTest(store, {
  visibility: { ...store.snap.visibility, "city:bus:1.section.callus": true },
})
assert.equal(store.snap.visibility["city:bus:1.section.callus"], true, "callus turned ON via eye toggle")

assert.equal(releaseDraftStore(storeId), true, "idle store released after test")
assert.equal(draftStoresSizeForTest(), before, "no leak after selfcheck teardown")

console.log("page-sections-order-visibility.selfcheck: ok")
