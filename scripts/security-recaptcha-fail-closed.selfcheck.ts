import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const root = process.cwd()
const src = readFileSync(join(root, "lib/recaptcha.ts"), "utf8")

// Security posture checks (fail-closed by design)
assert.match(src, /Fail-Closed|fail-closed|fail closed/i, "File must reference fail-closed production posture in top comment")

// Bypass should be strictly guarded with non-production env.
assert.match(
  src,
  /env === "local"|env === "dev"|getBustourDeployEnv\(\)/,
  "Bypass logic must gate on explicit non-production deploy env",
)
// Production: missing secret key => {ok:false} (fail-closed)
assert.match(src, /!status\.secretSet[\s\S]{0,100}ok:\s*false|secretSet[\s\S]{0,200}ok:\s*false|RECAPTCHA_SECRET_KEY missing[\s\S]{0,150}ok:\s*false/)
// Token missing when required: must reject
assert.match(src, /opts\.required[\s\S]{0,100}!token[\s\S]{0,150}ok:\s*false|!token[\s\S]{0,100}opts\.required/)
// Network errors: fail closed in production
assert.match(src, /catch\s*\([\s\S]{0,250}network error[\s\S]{0,100}ok:\s*false/)

console.log("security-recaptcha-fail-closed checks passed")
