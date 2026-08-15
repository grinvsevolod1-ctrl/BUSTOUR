/**
 * Phone: free typing; format only when complete (libphonenumber-js).
 * Run: npx tsx scripts/mask-phone.selfcheck.ts
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import {
  formatPhoneIfComplete,
  sanitizePhoneTyping,
  validateLead,
} from "../lib/lead"

// Free typing — do not wipe +, 3, 8…
assert.equal(sanitizePhoneTyping(""), "")
assert.equal(sanitizePhoneTyping("+"), "+")
assert.equal(sanitizePhoneTyping("+3"), "+3")
assert.equal(sanitizePhoneTyping("+37"), "+37")
assert.equal(sanitizePhoneTyping("3"), "3")
assert.equal(sanitizePhoneTyping("8029"), "8029")
assert.equal(sanitizePhoneTyping("80295555555"), "80295555555")
assert.equal(sanitizePhoneTyping("+7 900"), "+7 900")
assert.equal(sanitizePhoneTyping("abc+375(29)xyz"), "+375(29)")

// Incomplete: leave as typed (no forced mask)
assert.equal(formatPhoneIfComplete("+3"), "+3")
assert.equal(formatPhoneIfComplete("8029"), "8029")
assert.equal(formatPhoneIfComplete("+375 (29)"), "+375 (29)")

// Complete BY / RU / intl → international format
assert.match(formatPhoneIfComplete("80295555555"), /^\+375\s/)
assert.match(formatPhoneIfComplete("+375295555555"), /^\+375\s/)
assert.match(formatPhoneIfComplete("0295555555"), /^\+375\s/)
assert.match(formatPhoneIfComplete("+79001234567"), /^\+7\s/)
assert.match(formatPhoneIfComplete("89001234567"), /^\+7\s/)

assert.equal(Object.keys(validateLead({ name: "Иван", phone: "+7 900 123-45-67" })).length, 0)
assert.equal(Object.keys(validateLead({ name: "Иван", phone: "80295555555" })).length, 0)

const modal = readFileSync(join(process.cwd(), "components/site/modals/modal-testimonial.tsx"), "utf8")
assert.match(modal, /sanitizePhoneTyping/, "review modal free typing")
assert.match(modal, /formatPhoneIfComplete/, "review modal format on blur")
assert.doesNotMatch(modal, /maskPhone\(e\.target\.value\)/, "no live maskPhone on change")

const leadForm = readFileSync(join(process.cwd(), "components/site/lead-form.tsx"), "utf8")
assert.match(leadForm, /sanitizePhoneTyping/, "lead form free typing")
assert.match(leadForm, /formatPhoneIfComplete/, "lead form format on blur")

for (const file of ["modal-tour-order.tsx", "modal-bus-order.tsx"]) {
  const src = readFileSync(join(process.cwd(), "components/site/modals", file), "utf8")
  assert.match(src, /sanitizePhoneTyping/, `${file} free typing`)
  assert.match(src, /formatPhoneIfComplete/, `${file} format on blur`)
}

console.log("mask-phone.selfcheck: ok")
