import assert from "node:assert/strict"
import { DEFAULT_AVIA_SLUG, resolveAviaSlug } from "../lib/avia-slug"

assert.equal(DEFAULT_AVIA_SLUG, "aviatury")
assert.equal(resolveAviaSlug(undefined), "aviatury")
assert.equal(resolveAviaSlug(""), "aviatury")
assert.equal(resolveAviaSlug("  "), "aviatury")
assert.equal(resolveAviaSlug("aviatory"), "aviatury")
assert.equal(resolveAviaSlug("avia-tours"), "avia-tours")
console.log("avia-slug.selfcheck ok")
