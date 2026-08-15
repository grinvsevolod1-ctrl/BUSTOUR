import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const root = process.cwd()
const notifySrc = readFileSync(join(root, "lib/notify.ts"), "utf8")
const leadRoute = readFileSync(join(root, "app/api/lead/route.ts"), "utf8")
const reviewRoute = readFileSync(join(root, "app/api/review/route.ts"), "utf8")

const allSrc = notifySrc + "\n" + leadRoute + "\n" + reviewRoute

assert.doesNotMatch(
  notifySrc,
  /console\.(info|log|debug|warn|error)\([^)]*data\.name|console\.(info|log|debug|warn|error)\([^)]*data\.phone|console\.(info|log|debug|warn|error)\([^)]*lines\.join/,
  "notify.ts must NOT log PII fields (name, phone, email, message) to console",
)
assert.doesNotMatch(
  notifySrc,
  /new lead:/,
  "notify.ts must not log the PII-packed 'new lead:' banner",
)
assert.match(
  notifySrc,
  /correlationId|\[notify\] lead type=/,
  "notify.ts must log only safe metadata (type/correlationId/status) with [notify] prefix",
)
assert.doesNotMatch(
  reviewRoute,
  /notifyLead\([\s\S]{0,400}phone,\s*\n\s*message:.*\n/,
  "review notifyLead call must not pass plaintext phone to staff alert; use correlation instead",
)
assert.match(
  reviewRoute,
  /checkRateLimit|rateStore|429|Too Many/,
  "review route must have rate limiting logic like the lead route",
)

console.log("security-pii-no-leak checks passed")
