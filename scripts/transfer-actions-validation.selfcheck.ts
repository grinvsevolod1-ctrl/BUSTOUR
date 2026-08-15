/**
 * Transfer admin actions: Zod + try/catch (audit FORM-01/02).
 * Run: npx tsx scripts/transfer-actions-validation.selfcheck.ts
 */
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import {
  transferSaveSchema,
  transferSchedulesSaveSchema,
  zodFirstError,
} from "../lib/validations/admin"

const ok = transferSaveSchema.safeParse({
  slug: "sheremetyevo",
  category: "airport",
  title: "Шереметьево",
  intro: "",
  priceRoundTrip: 100,
  priceOneWay: 50,
  image: "",
})
assert.equal(ok.success, true)

const badSlug = transferSaveSchema.safeParse({
  slug: "BAD SLUG",
  category: "airport",
  title: "X",
  intro: "",
  priceRoundTrip: 0,
  priceOneWay: 0,
  image: "",
})
assert.equal(badSlug.success, false)
assert.ok(zodFirstError(badSlug.error!).includes("Slug") || zodFirstError(badSlug.error!).includes("slug"))

const neg = transferSaveSchema.safeParse({
  slug: "ok",
  category: "airport",
  title: "X",
  intro: "",
  priceRoundTrip: -1,
  priceOneWay: 0,
  image: "",
})
assert.equal(neg.success, false)

const sched = transferSchedulesSaveSchema.safeParse({
  transferId: 1,
  direction: "outbound",
  rows: [{ departureTime: "10:00", arrival: "A", note: "", bookingHref: "" }],
})
assert.equal(sched.success, true)

const badDir = transferSchedulesSaveSchema.safeParse({
  transferId: 1,
  direction: "sideways",
  rows: [],
})
assert.equal(badDir.success, false)

const root = path.join(import.meta.dirname, "..")
const actions = fs.readFileSync(path.join(root, "app/admin/actions.ts"), "utf8")
assert.ok(actions.includes("transferSaveSchema"), "saveTransfer uses Zod")
assert.ok(actions.includes("transferSchedulesSaveSchema"), "schedules use Zod")
assert.ok(actions.includes("mapDbError"), "DB errors mapped")
assert.ok(
  /saveTransferAction[\s\S]*?catch\s*\(err\)[\s\S]*?mapDbError/.test(actions),
  "saveTransferAction try/catch",
)
assert.ok(
  /saveTransferSchedulesAction[\s\S]*?catch\s*\(err\)[\s\S]*?mapDbError/.test(actions),
  "saveTransferSchedulesAction try/catch",
)

console.log("transfer-actions-validation.selfcheck: ok")
