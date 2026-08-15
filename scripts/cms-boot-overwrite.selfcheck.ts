/**
 * Guard: boot/init must not repeatedly overwrite deliberate CMS values with seed defaults.
 * Run: npx tsx scripts/cms-boot-overwrite.selfcheck.ts
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const init = readFileSync(join(process.cwd(), "lib/db/init.ts"), "utf8")

assert.doesNotMatch(init, /UPDATE\s+settings[\s\S]*openstreetmap/i, "boot must not rewrite saved map settings")
assert.doesNotMatch(init, /um=constructor/)

const defaultsStart = init.indexOf("async function seedSettingsDefaults()")
const defaultsEnd = init.indexOf("async function seedContentBlocks()", defaultsStart)
assert.ok(defaultsStart >= 0 && defaultsEnd > defaultsStart, "settings default seed function exists")
const defaultsSeed = init.slice(defaultsStart, defaultsEnd)
assert.match(defaultsSeed, /existingKeys\.has\(key\)/, "defaults are limited to missing keys")
assert.match(defaultsSeed, /onConflictDoNothing\(\)/, "parallel startup cannot overwrite existing values")
assert.doesNotMatch(defaultsSeed, /onConflictDoUpdate|\.update\(settings\)/, "defaults must never overwrite CMS values")

console.log("cms-boot-overwrite.selfcheck: ok")