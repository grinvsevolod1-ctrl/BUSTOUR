/**
 * Selfcheck: BASTUR_DEPLOY_ENV / SITE_URL → logical deploy target.
 * Run: npx tsx scripts/deploy-env.selfcheck.ts
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { deployEnvAdminLabel, getBustourDeployEnv } from "../lib/deploy-env"

const keys = ["BASTUR_DEPLOY_ENV", "NEXT_PUBLIC_SITE_URL", "NODE_ENV", "VERCEL_ENV"] as const
const orig: Record<string, string | undefined> = {}
for (const k of keys) orig[k] = process.env[k]

function clear() {
  for (const k of keys) delete process.env[k]
}

try {
  clear()
  process.env.NODE_ENV = "development"
  assert.equal(getBustourDeployEnv(), "local")
  assert.equal(deployEnvAdminLabel(), "LOCAL")

  clear()
  process.env.BASTUR_DEPLOY_ENV = "dev"
  process.env.NODE_ENV = "production"
  process.env.NEXT_PUBLIC_SITE_URL = "http://31.77.228.133:3000"
  assert.equal(getBustourDeployEnv(), "dev")
  assert.equal(deployEnvAdminLabel(), "DEV")

  clear()
  process.env.NODE_ENV = "production"
  process.env.NEXT_PUBLIC_SITE_URL = "http://31.77.228.133:3000"
  assert.equal(getBustourDeployEnv(), "dev", "http SITE_URL implies dev stand")

  clear()
  process.env.BASTUR_DEPLOY_ENV = "production"
  process.env.NODE_ENV = "production"
  process.env.NEXT_PUBLIC_SITE_URL = "https://bastur.by"
  assert.equal(getBustourDeployEnv(), "production")
  assert.equal(deployEnvAdminLabel(), null)

  clear()
  process.env.VERCEL_ENV = "production"
  process.env.NODE_ENV = "production"
  assert.equal(getBustourDeployEnv(), "production")

  clear()
  process.env.VERCEL_ENV = "preview"
  assert.equal(getBustourDeployEnv(), "dev")

  const siteLayout = readFileSync(join(process.cwd(), "app", "(site)", "layout.tsx"), "utf8")
  assert.match(
    siteLayout,
    /export const dynamic = ["']force-dynamic["']/,
    "public CMS pages must read runtime settings instead of build-time defaults",
  )

  console.log("ok")
} finally {
  for (const k of keys) {
    if (orig[k] === undefined) delete process.env[k]
    else process.env[k] = orig[k]
  }
}
