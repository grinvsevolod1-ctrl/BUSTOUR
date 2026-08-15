/**
 * reCAPTCHA v3 helpers self-check (no network).
 * Run: npx tsx scripts/recaptcha.selfcheck.ts
 */
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import {
  captchaRequiredClientError,
  isCaptchaStatusVisible,
  captchaClientError,
} from "../lib/recaptcha-public"
import { verifyRecaptchaToken } from "../lib/recaptcha"

const root = path.join(import.meta.dirname, "..")
const shell = fs.readFileSync(path.join(root, "components/site/modals/site-modal-shell.tsx"), "utf8")
assert.ok(shell.includes("grecaptcha"), "loads grecaptcha")
assert.ok(shell.includes("executeRecaptchaV3"), "shared v3 execute helper")
assert.ok(shell.includes("Капча:"), "status label")
assert.ok(shell.includes("пройдена"), "status passed copy")
assert.ok(shell.includes("не пройдена"), "status failed copy")
assert.ok(shell.includes("captchaToken"), "submit gated by captchaToken")
assert.ok(shell.includes("Капча не подключена"), "disabled copy when keys unset")
assert.ok(!shell.includes("render=explicit"), "no v2 explicit render")
assert.ok(!shell.includes("Введите символы, изображенные на картинке"), "placeholder gone")
assert.ok(!shell.includes("Подтвердите, что вы не робот"), "v2 checkbox label gone")

const api = fs.readFileSync(path.join(root, "app/api/lead/route.ts"), "utf8")
assert.ok(api.includes("verifyRecaptchaToken"), "API verifies token")

const reviewApi = fs.readFileSync(path.join(root, "app/api/review/route.ts"), "utf8")
assert.ok(reviewApi.includes("verifyRecaptchaToken"), "review API verifies token")
assert.ok(reviewApi.includes("createReview"), "review API creates review")
assert.ok(reviewApi.includes("approved: false"), "site reviews start pending")
assert.ok(reviewApi.includes("required: true"), "review captcha required when wired")

const pub = fs.readFileSync(path.join(root, "lib/recaptcha-public.ts"), "utf8")
assert.ok(pub.includes("NEXT_PUBLIC_RECAPTCHA_SITE_KEY"), "public site key")
assert.ok(pub.includes("captchaRequiredClientError"), "required captcha helper")
assert.ok(pub.includes("isCaptchaStatusVisible"), "CMS status visibility helper")
assert.ok(pub.includes("site.captchaStatusVisible"), "CMS key")

const srv = fs.readFileSync(path.join(root, "lib/recaptcha.ts"), "utf8")
assert.ok(srv.includes("siteverify"), "Google siteverify")
assert.ok(srv.includes("getCaptchaWiringStatus"), "wiring status helper")
assert.ok(srv.includes("score"), "v3 score check")
assert.ok(srv.includes("0.5") || srv.includes("MIN_SCORE"), "score threshold 0.5")

const seed = fs.readFileSync(path.join(root, "lib/db/cms-seed.ts"), "utf8")
assert.ok(seed.includes('"site.captchaStatusVisible": "0"'), "default CMS setting off")

const adminCfg = fs.readFileSync(path.join(root, "lib/admin-config.ts"), "utf8")
assert.ok(adminCfg.includes("site.captchaStatusVisible"), "admin settings field")
assert.ok(
  /site\.captchaStatusVisible[\s\S]*?defaultValue:\s*"0"/.test(adminCfg),
  "admin default off",
)

const settingsPage = fs.readFileSync(
  path.join(root, "app/admin/(protected)/settings/page.tsx"),
  "utf8",
)
assert.ok(settingsPage.includes("showCaptchaStatusSetting"), "DEV-gated settings prop")
assert.ok(
  settingsPage.includes('getBustourDeployEnv() !== "production"') ||
  settingsPage.includes('getBustourDeployEnv() === "dev"'),
  "gated on non-production / DEV stand",
)
assert.ok(settingsPage.includes("getCaptchaWiringStatus"), "wiring status from server")

const settingsForm = fs.readFileSync(path.join(root, "components/admin/settings-form.tsx"), "utf8")
assert.ok(settingsForm.includes("showCaptchaStatusSetting"), "form filters captcha field")
assert.ok(
  fs.existsSync(path.join(root, "components/admin/captcha-config-status.tsx")),
  "config status button",
)

const leadForm = fs.readFileSync(path.join(root, "components/site/lead-form.tsx"), "utf8")
assert.ok(leadForm.includes("ModalCaptchaRow"), "lead form uses shared captcha")
assert.ok(leadForm.includes("captchaToken"), "lead form sends captchaToken")

for (const file of [
  "modal-tour-order.tsx",
  "modal-bus-order.tsx",
]) {
  const src = fs.readFileSync(path.join(root, "components/site/modals", file), "utf8")
  assert.ok(src.includes("captchaToken"), `${file} sends captchaToken`)
  assert.ok(src.includes("captchaClientError"), `${file} client check`)
  assert.ok(src.includes("captchaToken={values.captcha}"), `${file} disables CTA until token`)
  assert.ok(!src.includes("Введите символы с картинки"), `${file} old copy gone`)
}

{
  const src = fs.readFileSync(path.join(root, "components/site/modals/modal-testimonial.tsx"), "utf8")
  assert.ok(src.includes("captchaToken"), "modal-testimonial sends captchaToken")
  assert.ok(src.includes("captchaRequiredClientError"), "modal-testimonial required captcha")
  assert.ok(src.includes("captchaToken={values.captcha}"), "modal-testimonial disables CTA until token")
  assert.ok(!src.includes("Введите символы с картинки"), "modal-testimonial old copy gone")
}

assert.equal(isCaptchaStatusVisible(null), false, "status default off")
assert.equal(isCaptchaStatusVisible({}), false, "status default off empty")
assert.equal(isCaptchaStatusVisible({ "site.captchaStatusVisible": "1" }), true)
assert.equal(isCaptchaStatusVisible({ "site.captchaStatusVisible": "0" }), false)

async function main() {
  const prevSite = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY
  const prevSecret = process.env.RECAPTCHA_SECRET_KEY
  const prevBypass = process.env.BYPASS_RECAPTCHA
  const prevBypassAlt = process.env.RECAPTCHA_BYPASS
  const prevNodeEnv = process.env.NODE_ENV
  const prevDeployEnv = process.env.BASTUR_DEPLOY_ENV
  delete process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY
  delete process.env.RECAPTCHA_SECRET_KEY
  delete process.env.BYPASS_RECAPTCHA
  delete process.env.RECAPTCHA_BYPASS
  delete process.env.NODE_ENV
  delete process.env.BASTUR_DEPLOY_ENV
  assert.equal(captchaRequiredClientError(""), undefined, "no client block without keys")
  const res = await verifyRecaptchaToken("", { required: true })
  assert.equal(res.ok, true, "server skips without keys even if required")

  // Half-wired: site key only — must not block leads (audit SEC-02)
  process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY = "site-only"
  delete process.env.RECAPTCHA_SECRET_KEY
  const halfSite = await verifyRecaptchaToken("tok", { required: true })
  assert.equal(halfSite.ok, true, "half-wired site-only fail-open")

  // Half-wired: secret only — treat as not fully wired
  delete process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY
  process.env.RECAPTCHA_SECRET_KEY = "secret-only"
  const halfSecret = await verifyRecaptchaToken("", { required: true })
  assert.equal(halfSecret.ok, true, "half-wired secret-only fail-open")

  // ---- CAPTHA BYPASS AUDIT #1: AUTO-BYPASS on local deploy env (NODE_ENV=development) ----
  process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY = "site"
  process.env.RECAPTCHA_SECRET_KEY = "secret"
  process.env.NODE_ENV = "development"
  delete process.env.BASTUR_DEPLOY_ENV
  const autoBypassLocal = await verifyRecaptchaToken("", { required: true })
  assert.equal(autoBypassLocal.ok, true, "local (NODE_ENV=dev) bypasses captcha EVEN with keys")

  // ---- CAPTCHA BYPASS AUDIT #2: AUTO-BYPASS on BASTUR_DEPLOY_ENV=dev (VPS NODE_ENV=production) ----
  process.env.NODE_ENV = "production"
  process.env.BASTUR_DEPLOY_ENV = "dev"
  const autoBypassDev = await verifyRecaptchaToken("", { required: true })
  assert.equal(autoBypassDev.ok, true, "dev-stand (BASTUR_DEPLOY_ENV=dev, NODE_ENV=prod) auto-bypasses captcha")

  // ---- CAPTCHA BYPASS AUDIT #3: EXPLICIT BYPASS_RECAPTCHA=1 works ONLY on local/dev (fail-closed everywhere else) ----
  process.env.NODE_ENV = "production"
  delete process.env.BASTUR_DEPLOY_ENV
  process.env.BYPASS_RECAPTCHA = "1"
  const envBypassOnProd = await verifyRecaptchaToken("", { required: true })
  assert.equal(envBypassOnProd.ok, false, "BYPASS_RECAPTCHA=1 is IGNORED on production deploy target (fail-closed)")

  // Same bypass on NODE_ENV=development (local env) — works fine
  process.env.NODE_ENV = "development"
  delete process.env.BASTUR_DEPLOY_ENV
  process.env.BYPASS_RECAPTCHA = "1"
  const envBypass1 = await verifyRecaptchaToken("", { required: true })
  assert.equal(envBypass1.ok, true, "BYPASS_RECAPTCHA=1 bypasses on local/development env")

  // BYPASS_RECAPTCHA=true (alias value)
  process.env.BYPASS_RECAPTCHA = "true"
  const envBypass2 = await verifyRecaptchaToken("", { required: true })
  assert.equal(envBypass2.ok, true, "BYPASS_RECAPTCHA=true alias also bypasses on local")

  // Alt env RECAPTCHA_BYPASS=yes (synonym) — also ignored on prod
  delete process.env.BYPASS_RECAPTCHA
  process.env.NODE_ENV = "production"
  delete process.env.BASTUR_DEPLOY_ENV
  process.env.RECAPTCHA_BYPASS = "yes"
  const envBypassSynProd = await verifyRecaptchaToken("", { required: true })
  assert.equal(envBypassSynProd.ok, false, "RECAPTCHA_BYPASS=yes also IGNORED on production (fail-closed)")
  process.env.NODE_ENV = "development"
  const envBypass3 = await verifyRecaptchaToken("", { required: true })
  assert.equal(envBypass3.ok, true, "RECAPTCHA_BYPASS=yes synonym bypasses captcha on local")

  // ---- CAPTCHA BYPASS AUDIT #4: production fail-closed when keys missing / token absent ----
  delete process.env.BYPASS_RECAPTCHA
  delete process.env.RECAPTCHA_BYPASS
  process.env.NODE_ENV = "production"
  delete process.env.BASTUR_DEPLOY_ENV
  delete process.env.NEXT_PUBLIC_SITE_URL
  delete process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY
  delete process.env.RECAPTCHA_SECRET_KEY

  // Production + no secret key = fail-closed (reject, security)
  const noSecretReq = await verifyRecaptchaToken("tok", { required: true })
  assert.equal(noSecretReq.ok, false, "production without RECAPTCHA_SECRET_KEY blocks request (fail-closed)")

  // Production + required empty token = reject
  process.env.RECAPTCHA_SECRET_KEY = "secret-only"
  const noTokenReq = await verifyRecaptchaToken("", { required: true })
  assert.equal(noTokenReq.ok, false, "production with required + empty token rejects (fail-closed)")

  // Production + short token = reject
  const shortTok = await verifyRecaptchaToken("short", { required: true })
  assert.equal(shortTok.ok, false, "production with short/invalid token rejects (fail-closed)")

  // Lib exposes expected public helpers (static contract)
  const mod = await import("@/lib/recaptcha")
  assert.equal(typeof mod.getCaptchaWiringStatus, "function", "getCaptchaWiringStatus exported")
  assert.equal(typeof mod.isCaptchaWired, "function", "isCaptchaWired exported")
  assert.equal(typeof mod.verifyRecaptchaToken, "function", "verifyRecaptchaToken exported")
  const modPublic = await import("@/lib/recaptcha-public")
  assert.equal(typeof modPublic.isCaptchaStatusVisible, "function", "isCaptchaStatusVisible exported from recaptcha-public")

  // ---- CAPTCHA BYPASS AUDIT #5: public (client) helpers also auto-disable on local ----
  delete process.env.NODE_ENV
  delete process.env.BASTUR_DEPLOY_ENV
  delete process.env.NEXT_PUBLIC_SITE_URL
  process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY = "site"
  process.env.RECAPTCHA_SECRET_KEY = "secret"
  // NODE_ENV undefined = treated as local by deploy-env.ts
  const clientDisabledLocal = captchaClientError("")
  assert.equal(clientDisabledLocal, undefined, "client captcha disabled automatically on local (keys set but bypassed)")

  if (prevSite !== undefined) process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY = prevSite
  else delete process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY
  if (prevSecret !== undefined) process.env.RECAPTCHA_SECRET_KEY = prevSecret
  else delete process.env.RECAPTCHA_SECRET_KEY
  if (prevBypass !== undefined) process.env.BYPASS_RECAPTCHA = prevBypass
  else delete process.env.BYPASS_RECAPTCHA
  if (prevBypassAlt !== undefined) process.env.RECAPTCHA_BYPASS = prevBypassAlt
  else delete process.env.RECAPTCHA_BYPASS
  if (prevNodeEnv !== undefined) process.env.NODE_ENV = prevNodeEnv
  else delete process.env.NODE_ENV
  if (prevDeployEnv !== undefined) process.env.BASTUR_DEPLOY_ENV = prevDeployEnv
  else delete process.env.BASTUR_DEPLOY_ENV
  // clean other side-effects from test above
  const prevSiteUrl = process.env.NEXT_PUBLIC_SITE_URL
  if (prevSiteUrl === undefined) delete process.env.NEXT_PUBLIC_SITE_URL

  console.log("recaptcha.selfcheck: ok — bypass rules verified (local/dev + env flag)")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
