/**
 * Static pollution guard for e2e/smoke: create must pair with finally teardown;
 * hanging-tours excluded from default project; settings mutations must restore.
 * Run: npm run test:e2e-isolation
 */
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

const root = process.cwd()
const failures: string[] = []

function read(rel: string) {
  return fs.readFileSync(path.join(root, rel), "utf8")
}

/** Local-only specs/scripts may be absent on a fresh clone — validate only when present. */
function readOptional(rel: string): string | null {
  const abs = path.join(root, rel)
  if (!fs.existsSync(abs)) {
    console.log(`e2e-isolation.selfcheck: ${rel} not found, skipping (local-only file)`)
    return null
  }
  return fs.readFileSync(abs, "utf8")
}

function fail(msg: string) {
  failures.push(msg)
}

// --- playwright: hanging-tours must not run in default chromium ---
{
  const cfg = read("playwright.config.ts")
  assert.ok(cfg.includes("hanging-tours-city"), "playwright.config must mention hanging-tours-city")
  const chromiumBlock = cfg.match(/name:\s*"chromium"[\s\S]*?(?=name:\s*"migration"|]\s*,?\s*$)/)
  assert.ok(chromiumBlock, "chromium project block not found")
  if (!/testIgnore:[\s\S]*hanging-tours-city/.test(chromiumBlock[0]!)) {
    fail("chromium project must testIgnore hanging-tours-city.spec.ts")
  }
  const pkg = read("package.json")
  if (!/"test:e2e"\s*:\s*"[^"]*--project=chromium/.test(pkg)) {
    fail('package.json test:e2e must limit to --project=setup --project=chromium (exclude migration)')
  }
}

// --- page-alerts: snapshot/restore in finally ---
{
  const src = readOptional("e2e/page-alerts.spec.ts")
  if (src !== null) {
    const hasSnap =
      /withSettingsSnapshot/.test(src) ||
      (/finally\s*\{/.test(src) && /alertText|alertBox\.fill\(""\)|restore/.test(src))
    if (!hasSnap) {
      fail("e2e/page-alerts.spec.ts must snapshot/restore alertText (withSettingsSnapshot or finally restore)")
    }
    if (/test\([^)]*clear alert/.test(src) && !/finally\s*\{/.test(src) && !/withSettingsSnapshot/.test(src)) {
      fail("e2e/page-alerts.spec.ts: cleanup-only serial clear tests are forbidden — use finally")
    }
  }
}

// --- shortcode seed/smoke: must restore settings ---
{
  const seed = readOptional("scripts/seed-page-seo-shortcode.ts")
  const smoke = readOptional("scripts/smoke-page-shortcodes.ts")
  const shortcodes = readOptional("e2e/public-shortcodes.spec.ts")
  const restoreHint =
    /withSettingsSnapshot|seedPageSeoWithRestore|RESTORE|restoreSettings|SEO_RESTORE|snapshot|previous|prevSeo|finally/
  const present = [seed, smoke, shortcodes].filter((s): s is string => s !== null)
  if (present.length > 0 && !present.some((s) => restoreHint.test(s))) {
    fail(
      "seed-page-seo-shortcode / smoke-page-shortcodes / public-shortcodes must restore seoTitle (snapshot/finally)",
    )
  }
  // Live overwrite without restore helper in seed alone is OK if callers wrap with restore —
  // but smoke and e2e must not call seed without restore.
  if (smoke !== null && /seed-page-seo-shortcode/.test(smoke) && !restoreHint.test(smoke)) {
    fail("scripts/smoke-page-shortcodes.ts seeds live SEO without restore")
  }
  if (shortcodes !== null && /seed-page-seo-shortcode|function seed\(/.test(shortcodes) && !restoreHint.test(shortcodes)) {
    fail("e2e/public-shortcodes.spec.ts seeds live SEO without restore")
  }
}

// --- create fixtures: require finally / cleanupCatalogFixture / purgeArchivedRow ---
const CREATE_MARKERS =
  /createCountry|createCity|createBusTour|createFleetBus|\/admin\/(?:tours|buses|articles|cities|countries)\/new|qa_\$\{|uname\s*=\s*`qa_/
const TEARDOWN_MARKERS = /finally\s*\{|cleanupCatalogFixture|purgeArchivedRow|withSettingsSnapshot|purgeAdminUser/

const e2eDir = path.join(root, "e2e")
for (const file of fs.readdirSync(e2eDir).filter((f) => f.endsWith(".spec.ts"))) {
  if (file === "hanging-tours-city.spec.ts") continue // migration-only
  if (file === "rich-editor-media-text-ux.spec.ts") continue // no persist create
  const rel = `e2e/${file}`
  const src = read(rel)
  if (!CREATE_MARKERS.test(src)) continue
  if (!TEARDOWN_MARKERS.test(src)) {
    fail(`${rel}: creates entities but has no finally / cleanupCatalogFixture / purgeArchivedRow`)
    continue
  }
  // Serial suite with cleanup only as last test (no finally) — pollution on mid-fail
  const hasCleanupOnlyLast =
    /test\(\s*["']cleanup/.test(src) && !/finally\s*\{/.test(src) && !/withSettingsSnapshot/.test(src)
  if (hasCleanupOnlyLast && /createCountry|createCity|createBusTour/.test(src)) {
    fail(`${rel}: cleanup only as last serial test — wrap create suites in try/finally`)
  }
  // CRUD / create that purge at end but not in finally
  if (
    /purgeArchivedRow/.test(src) &&
    !/finally\s*\{/.test(src) &&
    (/\/admin\/(?:tours|buses|articles)\/new|createFleetBus|E2E Text|reviews-add|qa_\$\{/.test(src) ||
      file === "reviews.spec.ts")
  ) {
    fail(`${rel}: purgeArchivedRow must run inside try/finally so fail mid-test still cleans up`)
  }
}

// --- archive.spec must not archive first live seed tour ---
{
  const src = readOptional("e2e/archive.spec.ts")
  if (
    src !== null &&
    /No tour with a live public URL|rows\.nth\(rowIndex\)/.test(src) &&
    !/E2E Archive Tour|makeFixtureIds|createBusTour/.test(src)
  ) {
    fail("e2e/archive.spec.ts tour case must use disposable E2E fixture tour, not first live seed tour")
  }
}

// --- admin-roles: qa_* users must be purged ---
{
  const src = readOptional("e2e/admin-roles-audit.spec.ts")
  if (src !== null) {
    if (/qa_\$\{/.test(src) && !/purgeAdminUser|purgeAdminByUsername|Удалить навсегда/.test(src)) {
      fail("e2e/admin-roles-audit.spec.ts creates qa_* users without soft-delete+purge")
    }
    if (/qa_\$\{/.test(src) && !/finally\s*\{/.test(src)) {
      fail("e2e/admin-roles-audit.spec.ts must purge qa_* in finally")
    }
  }
}

if (failures.length) {
  console.error("e2e-isolation.selfcheck FAILED:")
  for (const f of failures) console.error(" -", f)
  process.exit(1)
}
console.log("e2e-isolation.selfcheck: ok")
