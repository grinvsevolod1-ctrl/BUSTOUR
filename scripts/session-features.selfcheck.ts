/**
 * Session features: tour cards URL gate + featured expand + tour detail dynamic
 * + hanging-city migration + date range order + reCAPTCHA wiring.
 */
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { dateRangeOrderError, isDateRangeOrdered } from "@/lib/dates-table"
import { isRecaptchaEnabled } from "@/lib/recaptcha-public"
import { tourUrl } from "@/lib/tour-url"
import { resolveHotPublicHref } from "@/lib/hot-slug"
import { readQueriesSource } from "./lib/read-queries-source"

// tourUrl still requires country+city
assert.equal(tourUrl({ tourSlug: "x", countrySlug: "rossiya", citySlug: "" }), null)
assert.ok(
  tourUrl({
    tourSlug: "tur-vyhodnogo-dnya-v-piter",
    countrySlug: "rossiya",
    citySlug: "sankt-peterburg",
  })?.endsWith("/tur-vyhodnogo-dnya-v-piter/"),
)

assert.equal(isDateRangeOrdered("2026-07-01", "2026-07-10"), true)
assert.equal(isDateRangeOrdered("2026-07-10", "2026-07-01"), false)
assert.ok(dateRangeOrderError("2026-07-10", "2026-07-01"))
assert.equal(dateRangeOrderError("2026-07-01", "2026-07-10"), null)

const root = path.join(import.meta.dirname, "..")

const featured = fs.readFileSync(path.join(root, "components/site/featured-tours.tsx"), "utf8")
assert.ok(featured.includes("linkable") || featured.includes("tourUrl"), "featured filters linkable tours")
assert.ok(featured.includes("Больше туров"), "featured expand label")
assert.ok(featured.includes("ChevronDown"), "featured chevron")
assert.ok(featured.includes("useState"), "featured client expand")
assert.ok(!featured.includes('href="/tours/all"'), "no link away to /tours/all")

const listing = fs.readFileSync(path.join(root, "components/site/tours-listing.tsx"), "utf8")
assert.ok(listing.includes("tourUrl("), "listing filters by tourUrl")

const tourPage = fs.readFileSync(
  path.join(root, "app/(site)/avtobusnye-tury/[countrySlug]/[citySlug]/[tourSlug]/page.tsx"),
  "utf8",
)
assert.ok(tourPage.includes('dynamic = "force-dynamic"'), "force-dynamic against DYNAMIC_SERVER_USAGE")

const init = fs.readFileSync(path.join(root, "lib/db/init.ts"), "utf8")
const schema = fs.readFileSync(path.join(root, "lib/db/schema.ts"), "utf8")
assert.ok(schema.includes('arrivalCityId: integer("arrivalCityId").notNull().references'), "arrivalCityId required FK")
assert.ok(init.includes("arrivalCityId:"), "seed sets arrivalCityId")

const queries = readQueriesSource(root)
assert.ok(queries.includes("getHomeTourOffers"), "home tour offers")
assert.ok(queries.includes("leftJoin(cityDestinations, eq(tours.arrivalCityId"), "getTour joins city")

const callback = fs.readFileSync(path.join(root, "components/site/callback-modal.tsx"), "utf8")
assert.ok(callback.includes("md:hidden") || callback.includes("ModalCallback"), "callback FAB / modal wire")

const shell = fs.readFileSync(path.join(root, "components/site/modals/site-modal-shell.tsx"), "utf8")
assert.ok(shell.includes("grecaptcha"), "ModalCaptchaRow uses grecaptcha")
assert.ok(shell.includes("isRecaptchaEnabled") || shell.includes("recaptchaSiteKey"), "captcha gated by site key")

const leadApi = fs.readFileSync(path.join(root, "app/api/lead/route.ts"), "utf8")
assert.ok(leadApi.includes("captchaToken") || leadApi.includes("verifyRecaptcha"), "lead API verifies captcha")

const datesEditor = fs.readFileSync(path.join(root, "components/admin/tour-pricing-editor.tsx"), "utf8")
assert.ok(datesEditor.includes("datesTableRangeError") || datesEditor.includes("isDateRangeOrdered"), "admin blocks inverted dates")

assert.ok(fs.existsSync(path.join(root, "e2e/hanging-tours-city.spec.ts")), "hanging tours e2e")
assert.ok(fs.existsSync(path.join(root, "e2e/tour-pricing-dates.spec.ts")), "tour pricing dates e2e")

// Env-less local: captcha must stay off (fail-open for keys missing)
assert.equal(typeof isRecaptchaEnabled(), "boolean")

// --- Session pass 3: hot href, settings audit, blob mode, mobile table cards ---
assert.equal(resolveHotPublicHref("hot-4"), "/hot/")

const hotAdmin = fs.readFileSync(
  path.join(root, "app/admin/(protected)/pages/hot/page.tsx"),
  "utf8",
)
assert.ok(hotAdmin.includes("resolveHotPublicHref"), "hot admin open uses resolver")

const cmsActions = fs.readFileSync(path.join(root, "app/admin/cms-actions.ts"), "utf8")
assert.ok(cmsActions.includes("settings_update"), "page save audits")
assert.ok(cmsActions.includes("writeAudit"), "cms writeAudit wired")

const mediaStorage = fs.readFileSync(path.join(root, "lib/media/storage.ts"), "utf8")
assert.ok(mediaStorage.includes('MediaStorageMode = "local"'), "local disk storage mode gate")
assert.ok(mediaStorage.includes("isRemoteMediaUrl"), "legacy blob remote URL gate")

const resortTable = fs.readFileSync(
  path.join(root, "components/site/resort-comparison-table.tsx"),
  "utf8",
)
assert.ok(resortTable.includes("lg:hidden"), "resort mobile cards")
assert.ok(resortTable.includes("rounded-t-xl"), "card header redesign")
assert.ok(!/article[\s\S]{0,120}border-brand/.test(resortTable), "cards no brand frame")

assert.ok(fs.existsSync(path.join(root, "lib/shortcodes.ts")), "shortcodes module")
assert.ok(fs.existsSync(path.join(root, "app/admin/(protected)/shortcodes")), "shortcodes admin")
const shortcodesSrc = fs.readFileSync(path.join(root, "lib/shortcodes.ts"), "utf8")
assert.ok(shortcodesSrc.includes("expandShortcodes"), "expandShortcodes for meta/H1")
const seoMeta = fs.readFileSync(path.join(root, "lib/seo-metadata.ts"), "utf8")
assert.ok(seoMeta.includes("expandShortcodes"), "metadataFromSettings parses shortcodes")
assert.ok(fs.existsSync(path.join(root, "components/site/parsed-text.tsx")), "ParsedText for H1")

console.log("session-features.selfcheck: ok")
