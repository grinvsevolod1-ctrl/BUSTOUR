/**
 * lead_success analytics after successful POST /api/lead.
 * Run: npx tsx scripts/lead-success-event.selfcheck.ts
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const lead = readFileSync(join(process.cwd(), "lib/lead.ts"), "utf8")
const analytics = readFileSync(join(process.cwd(), "lib/analytics.ts"), "utf8")
assert.match(lead, /export function emitLeadSuccess/)
assert.match(lead, /CustomEvent\(["']lead_success["']/)
assert.match(lead, /trackAnalyticsEvent/)
assert.match(analytics, /dataLayer\.push/)
assert.match(lead, /emitLeadSuccess\(\{[\s\S]*type:\s*input\.type/)
assert.match(lead, /if \(res\.ok && data\.ok\)[\s\S]*emitLeadSuccess/)

console.log("lead-success-event.selfcheck: ok")
