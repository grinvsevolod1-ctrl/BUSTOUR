/**
 * #99: /admin/pages/contacts uses same section tabs + order as other page editors;
 * public /contacts honors contacts.sections.order via PageExtras sectionPrefix.
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const admin = readFileSync(join(process.cwd(), "app/admin/(protected)/pages/contacts/page.tsx"), "utf8")
const pub = readFileSync(join(process.cwd(), "app/(site)/contacts/page.tsx"), "utf8")

assert.match(admin, /PageSettingsForm/, "admin: PageSettingsForm shell")
assert.match(admin, /PageSectionsManager/, "admin: section tabs / order manager")
assert.match(admin, /view=["']order["']/, "admin: order view tab")
assert.match(admin, /buildFaqSlots/, "admin: FAQ section slots")
assert.match(admin, /pageKey\s*=\s*["']contacts["']/, "admin: contacts pageKey")
assert.match(admin, /contacts\.section\.(faq|callus)|section\.faq/, "admin: faq/callus section keys")
assert.doesNotMatch(admin, /from ["']@\/components\/admin\/settings-form["']/, "admin: not bare SettingsForm-only page")

assert.match(pub, /sectionPrefix=["']contacts["']/, "public: sectionPrefix for order + toggles")
assert.match(pub, /faqScope=["']contacts["']/, "public: load contacts FAQ blocks")

console.log("contacts-admin-sections.selfcheck: ok")
