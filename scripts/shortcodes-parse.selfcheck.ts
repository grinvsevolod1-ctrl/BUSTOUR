import assert from "node:assert/strict"
import { parseShortcodes } from "../lib/shortcodes"

assert.equal(parseShortcodes("Year [Y]", { Y: "2026" }), "Year 2026")
assert.equal(parseShortcodes("[Y]-[Y]", { Y: "26" }), "26-26")
assert.equal(parseShortcodes("plain", {}), "plain")
assert.equal(parseShortcodes("[missing]", { Y: "1" }), "[missing]")
assert.equal(parseShortcodes("<p>[Y]</p>", { Y: "2026" }), "<p>2026</p>")
assert.equal(parseShortcodes("[ab12]", { ab12: "ok" }), "ok")
assert.equal(parseShortcodes("[bad-name]", { "bad-name": "x" } as Record<string, string>), "[bad-name]")

console.log("shortcodes-parse.selfcheck: ok")
