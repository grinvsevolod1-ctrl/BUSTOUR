import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const root = process.cwd()
const src = readFileSync(join(root, "lib/db/index.ts"), "utf8")

// Production guard: if env=production + missing DATABASE_URL => MUST throw Error
// with a specific constant code. Must not fallback to local file.
assert.match(src, /PRODUCTION_DATABASE_MISSING|throw new Error[\s\S]{0,100}production/i, "lib/db/index.ts must have explicit fail-closed throw when production lacks DATABASE_URL")

const srcCodeOnly = src.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "")
// Extract just lines after the dev if-block's closing brace (last return in dev)
// to a section that starts with PRODUCTION_ comment or after envUrl check.
const afterDevReturn = srcCodeOnly.split(/return\s+`file:\$\{path\.join\(dir,\s*"app\.db"\)\}`/).slice(-1)[0] ?? ""
// Production tail must contain throw new Error and must NOT have file: fallback return.
assert.match(afterDevReturn, /throw\s+new\s+Error/, "Production path must throw Error")
assert.doesNotMatch(
  afterDevReturn,
  /return\s*[`'"]file:/,
  "After dev block closes (no more `return file:...app.db`), production must NOT return file fallback",
)
// Ensure the final fallthrough (production) path: envUrl only, else throws — no warn.
// Also confirm: after env=production path has throw, warn is absent from fallthrough.
assert.ok(afterDevReturn.includes("throw new Error"), "Production path has throw new Error")
assert.ok(!afterDevReturn.includes("console.warn"), "Production path must not warn instead of throw; throwing.")

console.log("db-prod-no-local checks passed")
