import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { tourUrl } from "@/lib/tour-url"

assert.equal(
  tourUrl({ tourSlug: "piter", countrySlug: "rossiya", citySlug: "sankt-peterburg" }),
  "/avtobusnye-tury/rossiya/sankt-peterburg/piter/",
)

assert.equal(tourUrl({ tourSlug: "x", countrySlug: "", citySlug: "city" }), null)
assert.equal(tourUrl({ tourSlug: "x", countrySlug: "country", citySlug: "" }), null)
assert.equal(tourUrl({ tourSlug: "", countrySlug: "country", citySlug: "city" }), null)
assert.equal(tourUrl({ tourSlug: "x", countrySlug: null, citySlug: "city" }), null)
assert.equal(tourUrl({ tourSlug: "x", countrySlug: "country", citySlug: undefined }), null)

const ok = tourUrl({ tourSlug: "a", countrySlug: "b", citySlug: "c" })
assert.ok(ok && !ok.includes("unknown"))

// #72: bus tour page must redirect mismatched country/city to tourUrl canonical
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const tourPage = fs.readFileSync(
  path.join(root, "app/(site)/avtobusnye-tury/[countrySlug]/[citySlug]/[tourSlug]/page.tsx"),
  "utf8",
)
assert.ok(tourPage.includes("permanentRedirect"), "#72 permanentRedirect on mismatch")
assert.ok(tourPage.includes("tourUrl("), "#72 uses tourUrl for canonical")
assert.ok(
  tourPage.includes("countrySlug !== tour.countrySlug") &&
    tourPage.includes("citySlug !== tour.citySlug"),
  "#72 compares path segments to tour slugs",
)

console.log("tour-url.selfcheck: ok")
