/**
 * Resort cards pagination settings.
 * Run: npx tsx scripts/resort-cards-pagination.selfcheck.ts
 */
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import {
  resolveResortCardsLayout,
  resortCardsPageSize,
} from "@/lib/resort-cards-settings"

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")

assert.deepEqual(resolveResortCardsLayout({}), { rows: 2, paginate: true })
assert.deepEqual(resolveResortCardsLayout({ "hot.cities.rows": "1", "hot.cities.paginate": "0" }, "hot"), {
  rows: 1,
  paginate: false,
})
assert.equal(resortCardsPageSize(3, 2), 6)
assert.equal(resortCardsPageSize(2, 1), 2)

const admin = fs.readFileSync(path.join(root, "lib/admin-config.ts"), "utf8")
assert.ok(admin.includes("citiesCardsFields"), "admin exports citiesCardsFields")
assert.ok(admin.includes("cities.rows"), "admin has cities.rows field")
assert.ok(admin.includes("cities.paginate"), "admin has cities.paginate field")

const carousel = fs.readFileSync(path.join(root, "components/site/resort-cards-carousel.tsx"), "utf8")
assert.ok(carousel.includes('from "motion/react"'), "carousel uses motion/react")
assert.ok(carousel.includes("useReducedMotion"), "respects reduced motion")
assert.ok(carousel.includes("AnimatePresence"), "page flip via AnimatePresence")
// #31: mobile is horizontal snap strip, not vertical grid stack
assert.ok(carousel.includes("snap-x"), "mobile uses snap-x carousel")
assert.ok(carousel.includes("snap-mandatory"), "mobile snap-mandatory")
assert.ok(carousel.includes("MobileSnapCarousel"), "mobile snap branch exists")
assert.ok(carousel.includes("DesktopGridPager"), "desktop grid pager kept")
assert.ok(carousel.includes("overflow-x-auto"), "mobile horizontal scroll")
assert.ok(carousel.includes("sm:hidden"), "mobile strip hidden from sm+")
assert.ok(carousel.includes("hidden sm:block"), "desktop grid hidden below sm")
assert.ok(!/grid-cols-1/.test(carousel), "no mobile grid-cols-1 stack")

const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")) as {
  dependencies?: Record<string, string>
}
assert.ok(pkg.dependencies?.motion, "motion dependency installed")

console.log("resort-cards-pagination.selfcheck: ok")
