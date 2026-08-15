/**
 * Transfer booking must omit required email; normal tour order keeps it.
 * Run: npx tsx scripts/transfer-booking-email.selfcheck.ts
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { validateLead } from "../lib/lead"

const root = process.cwd()
const modal = readFileSync(join(root, "components/site/modals/modal-tour-order.tsx"), "utf8")
const transfer = readFileSync(join(root, "components/site/transfer-schedule-table.tsx"), "utf8")
const api = readFileSync(join(root, "app/api/lead/route.ts"), "utf8")

assert.match(modal, /requireEmail\s*=\s*true/, "ModalTourOrder defaults requireEmail=true")
assert.match(
  modal,
  /if\s*\(\s*requireEmail\s*&&\s*!values\.email\.trim\(\)\s*\)/,
  "email required only when requireEmail",
)
assert.match(
  modal,
  /\{\s*requireEmail\s*\?\s*\([\s\S]*?label="E-mail:"/,
  "email field gated by requireEmail",
)

assert.match(transfer, /requireEmail=\{false\}/, "transfer schedule skips email")
assert.match(transfer, /ModalTourOrder/, "transfer still uses ModalTourOrder")

assert.match(api, /if\s*\(\s*email\s*&&\s*!EMAIL_RE/, "API accepts missing email")
assert.doesNotMatch(
  api,
  /if\s*\(\s*!email\b/,
  "API must not require email presence",
)

const withoutEmail = validateLead({
  name: "Иван",
  phone: "+375 (29) 621-44-77",
  type: "booking",
})
assert.equal(Object.keys(withoutEmail).length, 0, "validateLead ok without email")

const withBadEmail = validateLead({
  name: "Иван",
  phone: "+375 (29) 621-44-77",
  email: "not-an-email",
  type: "booking",
})
assert.equal(withBadEmail.email, "Некорректный e-mail", "invalid email still rejected")

const missingName = validateLead({
  name: "",
  phone: "+375 (29) 621-44-77",
  type: "booking",
})
assert.ok(missingName.name, "name still required")

console.log("transfer-booking-email.selfcheck: ok")
