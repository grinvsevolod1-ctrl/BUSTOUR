/**
 * smart-test: static selfchecks by default; --all-selfcheck for DB/server.
 * Run: npx tsx scripts/smart-test.selfcheck.ts
 */
import assert from "node:assert/strict"
import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"
import { isServerSelfcheckSource, parseFailedSpecFromLine } from "./smart-test"

const src = readFileSync(join(process.cwd(), "scripts/smart-test.ts"), "utf8")
assert.match(src, /isServerSelfcheckSource|SERVER_SELFCHECK/, "filters server selfchecks")
assert.match(src, /--all-selfcheck/)
assert.match(src, /--selfcheck-only/)
assert.match(src, /onlyFailed/, "failed cache gated by --only-failed")

assert.equal(
  parseFailedSpecFromLine(
    "  1) [chromium] › e2e\\catalog-sidebar-expand.spec.ts:47:9 › avia: expanded",
  ),
  "e2e/catalog-sidebar-expand.spec.ts",
)
assert.equal(
  parseFailedSpecFromLine("[34/64] [chromium] › e2e\\city-sticky-save-wipe.spec.ts:23:9 › sticky"),
  null,
)

assert.equal(isServerSelfcheckSource('import { ensureDb } from "@/lib/db"\nensureDb()'), true)
assert.equal(isServerSelfcheckSource('import { createReview } from "@/lib/queries"'), true)
assert.equal(isServerSelfcheckSource('const base = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000"'), true)
assert.equal(isServerSelfcheckSource('import robots from "@/app/robots"'), true)

const adminApi = readFileSync(join(process.cwd(), "scripts/admin-api.selfcheck.ts"), "utf8")
assert.equal(isServerSelfcheckSource(adminApi), true, "admin-api is serverish")

const heading = readFileSync(join(process.cwd(), "scripts/bus-page-heading.selfcheck.ts"), "utf8")
assert.equal(isServerSelfcheckSource(heading), false, "bus-page-heading is static")

const count = readdirSync(join(process.cwd(), "scripts")).filter((n) =>
  n.endsWith(".selfcheck.ts"),
).length
assert.ok(count > 10)

console.log("smart-test.selfcheck: ok")
