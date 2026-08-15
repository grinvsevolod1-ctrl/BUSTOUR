/**
 * Hot admin page must open the fixed public route /hot/, not settings["hot.slug"].
 * Run: npx tsx scripts/hot-admin-href.selfcheck.ts
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { hotHomePageConfig } from "../lib/admin-config"
import { resolveHotPublicHref } from "../lib/hot-slug"

assert.equal(hotHomePageConfig().url, "/hot/")

assert.equal(resolveHotPublicHref(undefined), "/hot/")
assert.equal(resolveHotPublicHref(""), "/hot/")
assert.equal(resolveHotPublicHref("hot"), "/hot/")
assert.equal(resolveHotPublicHref("hot-4"), "/hot/")
assert.equal(resolveHotPublicHref("  HOT-4  "), "/hot/")
assert.equal(resolveHotPublicHref("something-else"), "/hot/")

const adminSrc = readFileSync(
  join(process.cwd(), "app/admin/(protected)/pages/hot/page.tsx"),
  "utf8",
)
assert.match(adminSrc, /resolveHotPublicHref/, "must call resolveHotPublicHref")
assert.match(adminSrc, /pageHref=\{pageHref\}/, "pageHref prop from resolved href")
assert.doesNotMatch(
  adminSrc,
  /pageHref=\{`\/\$\{slug\}\/`\}/,
  "must not build pageHref from settings hot.slug",
)

console.log("hot-admin-href.selfcheck ok")
