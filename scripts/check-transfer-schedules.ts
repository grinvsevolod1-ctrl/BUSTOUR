import assert from "node:assert/strict"
import { normalizeTransferScheduleRows } from "@/lib/queries"

const saved = normalizeTransferScheduleRows([
  { departureTime: " 06:30 ", arrival: "10:45", note: " (под прилёты до 00:00) ", bookingHref: "" },
  { departureTime: "12:00", arrival: "16:15", note: "", bookingHref: " /booking " },
])

assert.deepEqual(saved, [
  { departureTime: "06:30", arrival: "10:45", note: "(под прилёты до 00:00)", bookingHref: "" },
  { departureTime: "12:00", arrival: "16:15", note: "", bookingHref: "/booking" },
])
assert.equal(saved.length, 2)
assert.equal(saved[1].bookingHref, "/booking")
console.log("transfer schedules self-check: ok")
