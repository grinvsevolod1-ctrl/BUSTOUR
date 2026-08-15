import assert from "node:assert/strict"
import { formatPhoneIfComplete, isSupportedPhone, sanitizePhoneTyping, validateLead } from "../lib/lead"

assert.equal(formatPhoneIfComplete("440000000"), "+375 44 000 00 00")
assert.equal(formatPhoneIfComplete("80291234567"), "+375 29 123 45 67")
assert.equal(formatPhoneIfComplete("89161234567"), "+7 916 123 45 67")
assert.equal(sanitizePhoneTyping(""), "")
assert.equal(isSupportedPhone("+375 44 000 00 00"), true)
assert.equal(isSupportedPhone("+7 916 123-45-67"), true)
assert.equal(isSupportedPhone("+48 123 456 789"), false)
assert.ok(validateLead({ name: "Иван", phone: "+48 123 456 789", type: "contact" }).phone)

console.log("phone-by-ru.selfcheck: ok")
