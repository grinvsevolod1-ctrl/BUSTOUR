/**
 * Hours/phones from CMS; tel: links on public contacts surfaces.
 * Run: npx tsx scripts/contacts-cms-tel.selfcheck.ts
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { getDisplayPhones, telHref } from "../lib/contact-settings"

assert.equal(telHref("+375 (29) 621-44-77"), "tel:+375296214477")
assert.equal(telHref("79001234567"), "tel:79001234567")

const phones = getDisplayPhones({
  "site.phones": "+375 (29) 111-11-11\n+7 900 123-45-67",
} as Record<string, string>)
assert.equal(phones.length, 2)
assert.ok(phones.every((p) => p.href.startsWith("tel:")))

const header = readFileSync(join(process.cwd(), "components/site/site-header.tsx"), "utf8")
assert.match(header, /site\.hours/)
assert.match(header, /primaryPhone\.href|getPrimaryPhone/)

const contacts = readFileSync(join(process.cwd(), "app/(site)/contacts/page.tsx"), "utf8")
assert.match(contacts, /getDisplayPhones/)
assert.match(contacts, /site\.hoursFull|site\.hours/)
assert.match(contacts, /href=\{phone\.href\}/)

const footer = readFileSync(join(process.cwd(), "components/site/site-footer.tsx"), "utf8")
assert.match(footer, /getDisplayPhones/)

const callback = readFileSync(join(process.cwd(), "components/site/callback-modal.tsx"), "utf8")
assert.match(callback, /getOfficeHoursLabel|site\.hours/, "callback hours from CMS")
assert.match(callback, /getPrimaryPhone/, "callback shows company phone")
assert.doesNotMatch(
  callback,
  /перезвоним в рабочее время \(10:00–18:00\)/,
  "no hardcoded office hours in callback copy",
)

console.log("contacts-cms-tel.selfcheck: ok")
