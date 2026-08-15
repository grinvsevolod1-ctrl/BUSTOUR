/**
 * Catalog homes: resort cards = countries of that catalog; country pages keep cities.
 * Run: npx tsx scripts/catalog-home-country-cards.selfcheck.ts
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const root = process.cwd()
const read = (rel: string) => readFileSync(join(root, rel), "utf8")

const hot = read("app/(site)/hot/page.tsx")
assert.match(hot, /getCountries\(["']hot["']\)/, "hot home loads hot countries")
assert.match(hot, /cardKind=["']country["']/, "hot home cards are countries")
assert.doesNotMatch(hot, /getCityDestinations/, "hot home does not list all cities in cards")
assert.match(hot, /hrefForCity=\{[^}]*\/hot\/\$\{/, "hot country card links to /hot/{slug}/")

const hotCountry = read("app/(site)/hot/[countrySlug]/page.tsx")
assert.match(hotCountry, /countryCities/, "hot country page uses cities of country")
assert.match(hotCountry, /ResortCards cities=\{countryCities\}/, "hot country ResortCards = cities")
assert.doesNotMatch(hotCountry, /cardKind=["']country["']/, "hot country page is city cards")

const avia = read("app/(site)/aviatory/page.tsx")
assert.match(avia, /getAviaCountries/, "avia home uses avia countries")
assert.match(avia, /cardKind=["']country["']/, "avia home cards are countries")
assert.doesNotMatch(avia, /getCityDestinations/, "avia home no all-cities cards")

const aviaCountry = read("app/(site)/aviatory/[countrySlug]/page.tsx")
assert.match(aviaCountry, /countryCities/, "avia country has city list")
assert.match(aviaCountry, /ResortCards cities=\{countryCities\}/, "avia country cards = cities")

const bus = read("app/(site)/avtobusnye-tury/page.tsx")
assert.match(bus, /getCountries\(["']bus["']\)/, "bus home loads bus countries")
assert.match(bus, /cardKind=["']country["']/, "bus home cards are countries")
assert.doesNotMatch(bus, /getCityDestinations/, "bus home no all-cities cards")

const cards = read("components/site/resort-cards.tsx")
assert.match(cards, /cardKind/, "ResortCards supports country images")
assert.match(cards, /country:\$\{category\}:\$\{slug\}\.metaImage/, "country metaImage for cards")

console.log("catalog-home-country-cards.selfcheck: ok")
