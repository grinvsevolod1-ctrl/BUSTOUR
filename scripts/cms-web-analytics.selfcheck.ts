import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import {
  analyticsConfigFromSettings,
  safeRedirectUrl,
  setAnalyticsRuntime,
  trackAnalyticsEvent,
} from "../lib/analytics"

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8")
const seed = read("lib/db/cms-seed.ts")
const config = read("lib/admin-config.ts")
const provider = read("components/analytics-when-consented.tsx")
const settingsForm = read("components/admin/settings-form.tsx")
const siteLayout = read("app/(site)/layout.tsx")
const lead = read("lib/lead.ts")
const review = read("lib/public-review.ts")
const actions = read("app/admin/cms-actions.ts")
const init = read("lib/db/init.ts")

for (const [key, value] of Object.entries({
  "analytics.ymCounterId": "",
  "analytics.gtmId": "",
  "analytics.gaMeasurementId": "",
  "analytics.enableWebvisor": "true",
  "analytics.goalLeadSuccess": "lead_success",
  "analytics.goalCallbackSuccess": "callback_request",
  "analytics.goalReviewSuccess": "review_success",
  "analytics.successRedirectUrl": "",
})) {
  assert.match(seed, new RegExp(`"${key.replaceAll(".", "\\.")}": "${value}"`))
}

assert.match(config, /heading: "Веб-аналитика и цели"/)
assert.match(config, /Как настроить цели в Яндекс\.Метрике/)
assert.match(settingsForm, /EditorWorkspace/)
assert.match(settingsForm, /label: "Веб-аналитика и цели"/)
assert.match(provider, /useConsentCategory\("analytics"\)/)
assert.match(provider, /googletagmanager\.com\/gtm\.js/)
assert.match(provider, /mc\.yandex\.ru\/metrika\/tag\.js/)
assert.match(provider, /googletagmanager\.com\/gtag\/js/)
assert.match(siteLayout, /AnalyticsWhenConsented[\s\S]*settings=/)
assert.match(lead, /trackAnalyticsEvent/)
assert.match(lead, /goalCallbackSuccess/)
assert.match(review, /trackAnalyticsEvent/)
assert.match(review, /goalReviewSuccess/)
assert.match(actions, /writeAudit\([\s\S]*settings_update/)
assert.match(init, /existingKeys\.has\(key\)[\s\S]*onConflictDoNothing\(\)/)

assert.deepEqual(
  analyticsConfigFromSettings({
    "analytics.ymCounterId": " 12345678 ",
    "analytics.enableWebvisor": "false",
    "analytics.goalCallbackSuccess": "call_done",
    "analytics.successRedirectUrl": " /thanks ",
  }),
  {
    ymCounterId: "12345678",
    gtmId: "",
    gaMeasurementId: "",
    fbPixelId: "",
    enableWebvisor: false,
    goalLeadSuccess: "lead_success",
    goalCallbackSuccess: "call_done",
    goalReviewSuccess: "review_success",
    successRedirectUrl: "/thanks",
  },
)
assert.equal(safeRedirectUrl("https://evil.example"), "")
assert.equal(safeRedirectUrl("//evil.example"), "")

const calls: unknown[][] = []
const browser = {
  dataLayer: [] as Record<string, unknown>[],
  ym: (...args: unknown[]) => calls.push(args),
}
Object.assign(globalThis, { window: browser })
setAnalyticsRuntime(
  analyticsConfigFromSettings({
    "analytics.ymCounterId": "12345678",
    "analytics.goalCallbackSuccess": "call_done",
  }),
  true,
)
trackAnalyticsEvent("lead_success", "call_done", { leadType: "callback" })
assert.deepEqual(browser.dataLayer, [
  { event: "lead_success", goalId: "call_done", leadType: "callback" },
])
assert.deepEqual(calls, [[12345678, "reachGoal", "call_done", { leadType: "callback" }]])
Reflect.deleteProperty(globalThis, "window")

console.log("cms-web-analytics.selfcheck: ok")
