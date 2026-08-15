import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { CONSENT_TTL_MS, consentConfig } from "../lib/consent.config"
import { consentCopyRu } from "../lib/consent-copy-ru"
import { CONSENT_REOPEN_EVENT } from "../lib/consent-events"

assert.equal(consentConfig.storageKey, "bastur.cookieConsent.v2")
assert.equal(consentConfig.policyVersion, 1)
assert.equal(CONSENT_TTL_MS, 365 * 24 * 60 * 60 * 1000)
assert.equal(consentConfig.routes?.cookies, "/legal/cookies")

const ids = consentConfig.categories.map((c) => c.id).sort()
assert.deepEqual(ids, ["analytics", "functional", "marketing"])
assert.ok(!consentConfig.categories.some((c) => c.id === "essential"))

assert.equal(consentCopyRu.banner?.headline, "Настройка cookie")
assert.match(consentCopyRu.banner?.body ?? "", /на год/i)
assert.equal(consentCopyRu.banner?.essentialLabel, "Технические (обязательные)")
assert.equal(consentCopyRu.settingsLink?.label, "Настроить Cookies")

assert.equal(CONSENT_REOPEN_EVENT, "bastur:consent-reopen")
const link = readFileSync(join(process.cwd(), "components/cookie-settings-link.tsx"), "utf8")
assert.ok(link.includes("dispatchConsentReopen"), "footer link uses event bus")
assert.ok(!link.includes('from "consentium"'), "footer must not import consentium (Turbopack context dup)")
const siteConsent = readFileSync(join(process.cwd(), "components/site-consent.tsx"), "utf8")
assert.ok(siteConsent.includes("CONSENT_REOPEN_EVENT"), "SiteConsent listens for reopen event")

console.log("cookie-consent.selfcheck: ok")
