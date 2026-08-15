/**
 * Slash command search / shortcode keyword helpers.
 * Run: npx tsx scripts/slash-command-search.selfcheck.ts
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import {
  keywordsFromShortcode,
  normalizeSlashToken,
  slashQueryMatches,
} from "../components/admin/editor/slash-command-search"

assert.equal(normalizeSlashToken("current_year"), "currentyear")
assert.equal(normalizeSlashToken("текущий-год"), "текущийгод")
assert.equal(normalizeSlashToken("  /Text  "), "text")

assert.equal(slashQueryMatches("text", ["Текст", "text", "абзац"]), true)
assert.equal(slashQueryMatches("TEXT", ["Текст", "text"]), true)
assert.equal(slashQueryMatches("current", ["current_year", "текущий год"]), true)
assert.equal(slashQueryMatches("current_year", ["current_year"]), true)
assert.equal(slashQueryMatches("текущий_год", ["текущий год"]), true)
assert.equal(slashQueryMatches("текущий-год", ["текущий год"]), true)
assert.equal(slashQueryMatches("текущий", ["текущий год", "current_year"]), true)
assert.equal(slashQueryMatches("шорткод", ["shortcode", "шорткоды"]), true)
assert.equal(slashQueryMatches("shortcode", ["шорткод", "shortcode"]), true)
assert.equal(slashQueryMatches("xyzzy", ["Текст", "current_year"]), false)

const keys = keywordsFromShortcode({
  name: "current_year",
  description: "текущий год",
  value: "2026",
})
assert.ok(keys.includes("current_year"))
assert.ok(keys.includes("current"))
assert.ok(keys.includes("year"))
assert.ok(keys.some((k) => k.includes("текущий")))
assert.ok(keys.includes("shortcode"))
assert.ok(keys.includes("шорткод"))

const slash = readFileSync(join(process.cwd(), "components/admin/editor/slash-command.tsx"), "utf8")
assert.match(slash, /keywords:\s*\[[\s\S]*?"text"/)
assert.match(slash, /resolveSlashItems/)
assert.match(slash, /getAllShortcodesAction/)
assert.match(slash, /bustour:rich-editor-shortcodes/)
assert.match(slash, /prefetchSlashShortcodes/)
assert.match(slash, /slashTippyOptions/)
assert.match(slash, /fallbackPlacements/)
assert.match(slash, /preventOverflow/)
assert.match(slash, /strategy:\s*"fixed"/)
assert.match(slash, /confirmSlashKey/)
assert.match(slash, /key === "Tab"/)
assert.match(slash, /key === "Enter"/)
assert.match(slash, /popperInstance\?\.update/)

const editor = readFileSync(join(process.cwd(), "components/admin/rich-editor.tsx"), "utf8")
assert.match(editor, /prefetchSlashShortcodes/)
assert.match(editor, /bustour:rich-editor-shortcodes/)

console.log("slash command search checks passed")
