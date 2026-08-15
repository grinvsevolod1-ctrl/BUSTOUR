/**
 * Built-in [Y] always resolves to current calendar year (even if DB row missing).
 * Public H1/meta paths must expand shortcodes (avia/hot/rental/transfers).
 * Run: npx tsx scripts/shortcodes-builtin-year.selfcheck.ts
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { parseShortcodes, withBuiltinShortcodes } from "../lib/parse-shortcodes"

const year = String(new Date().getFullYear())

assert.equal(withBuiltinShortcodes({}).Y, year, "empty dict gets Y")
assert.equal(withBuiltinShortcodes({ Y: "1999" }).Y, year, "builtin Y overrides stale DB")
assert.equal(parseShortcodes("Туры [Y]", withBuiltinShortcodes({})), `Туры ${year}`)
assert.equal(parseShortcodes("<title>[Y]</title>", withBuiltinShortcodes({})), `<title>${year}</title>`)

const root = process.cwd()
const seo = readFileSync(join(root, "lib/seo-metadata.ts"), "utf8")
assert.match(seo, /metaKeywords/, "reads metaKeywords")
assert.match(seo, /keywordsExpanded|expandShortcodes\(keywordsRaw\)/, "meta keywords expand")

const aviaCity = readFileSync(join(root, "app/(site)/aviatory/[countrySlug]/[citySlug]/page.tsx"), "utf8")
assert.match(aviaCity, /ParsedText/, "avia city H1 uses ParsedText")

const transfers = readFileSync(join(root, "app/(site)/info/transfers/page.tsx"), "utf8")
assert.match(transfers, /ParsedText|expandShortcodes|expandPlainText/, "transfers titles expand shortcodes")

const transferDetail = readFileSync(join(root, "app/(site)/info/transfers/[slug]/page.tsx"), "utf8")
assert.match(transferDetail, /ParsedText|expandShortcodes|expandPlainText/, "transfer detail expands")

const resortCards = readFileSync(join(root, "components/site/resort-cards.tsx"), "utf8")
assert.match(resortCards, /expandShortcodes|expandPlainText/, "resort card names expand shortcodes")

const aviaCountry = readFileSync(join(root, "app/(site)/aviatory/[countrySlug]/page.tsx"), "utf8")
assert.match(aviaCountry, /ParsedText/, "avia country titles use ParsedText")

console.log("shortcodes-builtin-year.selfcheck: ok")
