/**
 * #36: PageSectionsManager draftStores must prune when idle.
 * Run: npx tsx scripts/draftstores-prune.selfcheck.ts
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import {
  draftStoresSizeForTest,
  getDraftStoreForTest,
  releaseDraftStore,
} from "../components/admin/page-sections-manager"

const root = process.cwd()
const src = readFileSync(join(root, "components/admin/page-sections-manager.tsx"), "utf8")

assert.ok(src.includes("releaseDraftStore(storeId)"), "unsubscribe calls releaseDraftStore")
assert.ok(src.includes("queueMicrotask"), "Strict Mode-safe microtask prune")
assert.match(src, /store\.listeners\.delete\(onChange\)/)

const idA = `selfcheck-a::${Date.now()}`
const idB = `selfcheck-b::${Date.now()}`
const before = draftStoresSizeForTest()

const storeA = getDraftStoreForTest(idA, "a", ["faq"])
const storeB = getDraftStoreForTest(idB, "b", ["hero"])
assert.equal(draftStoresSizeForTest(), before + 2)

const keep = () => {}
storeA.listeners.add(keep)
assert.equal(releaseDraftStore(idA), false, "must keep store while listeners > 0")
assert.equal(draftStoresSizeForTest(), before + 2)

storeA.listeners.delete(keep)
assert.equal(releaseDraftStore(idA), true, "prune when idle")
assert.equal(draftStoresSizeForTest(), before + 1)

storeB.listeners.add(keep)
storeB.listeners.add(() => {})
storeB.listeners.delete(keep)
assert.equal(releaseDraftStore(idB), false, "multi-subscriber: keep until last unsub")
storeB.listeners.clear()
assert.equal(releaseDraftStore(idB), true)
assert.equal(draftStoresSizeForTest(), before)

console.log("draftstores-prune.selfcheck: ok")
