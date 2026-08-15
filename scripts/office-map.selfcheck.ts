/**
 * Office map: CMS preserves input; rendering extracts src from iframe HTML.
 * Run: npx tsx scripts/office-map.selfcheck.ts
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import {
  DEFAULT_MAP_EMBED_URL,
  normalizeMapEmbedInput,
  resolveMapEmbedUrl,
} from "../lib/office-map"

const WIDGET =
  "https://yandex.by/map-widget/v1/?ll=27.701630%2C53.949784&mode=search&oid=156910472868&ol=biz&tab=related&z=14.89"

assert.equal(DEFAULT_MAP_EMBED_URL, WIDGET)
assert.equal(resolveMapEmbedUrl(""), WIDGET)
assert.equal(resolveMapEmbedUrl(WIDGET), WIDGET)
assert.equal(
  resolveMapEmbedUrl("https://yandex.ru/map-widget/v1/?oid=1"),
  "https://yandex.ru/map-widget/v1/?oid=1",
)
assert.ok(!resolveMapEmbedUrl(WIDGET).includes("openstreetmap"))

const iframePaste = `<iframe src="${WIDGET}" width="560" height="400"></iframe>`
assert.equal(normalizeMapEmbedInput(iframePaste), WIDGET)
assert.equal(resolveMapEmbedUrl(iframePaste), WIDGET)
assert.equal(normalizeMapEmbedInput(`<iframe src='${WIDGET}'></iframe>`), WIDGET)

const src = readFileSync(join(process.cwd(), "components/site/office-map.tsx"), "utf8")
assert.match(src, /"use client"/)
assert.match(src, /OfficeMapBlock/)
assert.doesNotMatch(src, /sanitizeMapIframeHtml|resolveMapMode|mapIframeHtml/)

const config = readFileSync(join(process.cwd(), "lib/admin-config.ts"), "utf8")
assert.match(config, /site\.mapEmbedUrl/)
assert.doesNotMatch(config, /site\.footerAbout/, "junk footerAbout removed")

const seed = readFileSync(join(process.cwd(), "lib/db/cms-seed.ts"), "utf8")
assert.match(seed, /site\.mapEmbedUrl/)
assert.doesNotMatch(seed, /site\.footerAbout/)

const cms = readFileSync(join(process.cwd(), "lib/cms.ts"), "utf8")
assert.doesNotMatch(cms, /normalizeMapEmbedInput/, "saveSettings preserves map embed HTML")
assert.match(cms, /\.values\(\{ key, value \}\)/, "saveSettings stores submitted value unchanged")

const init = readFileSync(join(process.cwd(), "lib/db/init.ts"), "utf8")
assert.doesNotMatch(init, /UPDATE\s+settings[\s\S]*openstreetmap/i, "boot must not rewrite saved map embeds")
assert.doesNotMatch(init, /um=constructor/, "must never wipe Yandex Constructor embeds on boot")

console.log("office-map.selfcheck: ok")
