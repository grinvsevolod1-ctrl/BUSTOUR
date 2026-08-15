/**
 * Visual pin suite wiring: routes catalog + Playwright visual project.
 * Run: npx tsx scripts/visual-pin-routes.selfcheck.ts
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const root = process.cwd()
const routes = readFileSync(join(root, "e2e/visual/routes.ts"), "utf8")
const helpers = readFileSync(join(root, "e2e/visual/helpers.ts"), "utf8")
const config = readFileSync(join(root, "playwright.config.ts"), "utf8")
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as {
  scripts: Record<string, string>
}

assert.match(routes, /PUBLIC_VISUAL_ROUTES/, "public routes export")
assert.match(routes, /ADMIN_VISUAL_ROUTES/, "admin routes export")
assert.match(routes, /VISUAL_WIDTHS\s*=\s*\[1440,\s*1024,\s*768,\s*320\]/, "QA breakpoints")
assert.match(routes, /path:\s*["']\/["']/, "home route")
assert.match(routes, /path:\s*["']\/admin["']/, "admin dashboard")
assert.match(routes, /path:\s*["']\/admin\/login["']/, "admin login")

assert.match(helpers, /toHaveScreenshot/, "pin uses Playwright screenshots")
assert.match(helpers, /maxDiffPixelRatio/, "tolerates minor pixel drift")

assert.match(config, /name:\s*["']visual["']/, "visual Playwright project")
assert.match(config, /__baselines__/, "committed baselines path")
assert.match(config, /testMatch:[\s\S]{0,40}visual/, "visual specs matched")
assert.ok(
  readFileSync(join(root, "e2e/visual/public.visual.spec.ts"), "utf8").includes("PUBLIC_VISUAL_ROUTES"),
  "public visual spec present",
)
assert.ok(
  readFileSync(join(root, "e2e/visual/admin.visual.spec.ts"), "utf8").includes("ADMIN_VISUAL_ROUTES"),
  "admin visual spec present",
)

assert.match(pkg.scripts["test:visual"] || "", /project=visual/, "test:visual script")
assert.match(pkg.scripts["test:visual:update"] || "", /update-snapshots/, "update baselines script")

const publicCount = (routes.match(/id:\s*["'][^"']+["']/g) || []).length
assert.ok(publicCount >= 20, `expected many pin routes, got ${publicCount}`)

console.log("visual-pin-routes.selfcheck: ok")
