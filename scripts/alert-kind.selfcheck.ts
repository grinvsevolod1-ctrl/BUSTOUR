import assert from "node:assert/strict"
import { parseAlertKind, ALERT_KIND_OPTIONS } from "@/lib/alert-kind"
import { pageAlertFields } from "@/lib/admin-config"

assert.equal(parseAlertKind(undefined), "info")
assert.equal(parseAlertKind(""), "info")
assert.equal(parseAlertKind("info"), "info")
assert.equal(parseAlertKind("warning"), "warning")
assert.equal(parseAlertKind("error"), "warning") // legacy → warning
assert.equal(parseAlertKind("bogus"), "info")
assert.equal(parseAlertKind("WARNING"), "info")

assert.deepEqual(
  ALERT_KIND_OPTIONS.map((o) => o.value),
  ["info", "warning"],
)
assert.ok(!ALERT_KIND_OPTIONS.some((o) => o.value === "error"))

const rental = pageAlertFields("rental")
assert.equal(rental.length, 2)
assert.equal(rental[0].key, "rental.alertText")
assert.equal(rental[0].type, "shortcode-textarea-multiline")
assert.equal(rental[1].key, "rental.alertType")
assert.equal(rental[1].type, "select")
assert.equal(rental[1].defaultValue, "info")
assert.deepEqual(
  rental[1].options?.map((o) => o.value),
  ["info", "warning"],
)

const bare = pageAlertFields("")
assert.equal(bare[0].key, "alertText")
assert.equal(bare[1].key, "alertType")

console.log("alert-kind.selfcheck: ok")
