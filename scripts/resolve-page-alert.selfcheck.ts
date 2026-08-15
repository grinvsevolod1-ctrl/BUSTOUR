/**
 * Pure resolve for PageAlert settings keys.
 * Run BEFORE implementing lib/page-alert.ts (TDD red).
 *
 * npx tsx scripts/resolve-page-alert.selfcheck.ts
 */
import assert from "node:assert/strict"
import { resolvePageAlert } from "@/lib/page-alert"

assert.deepEqual(resolvePageAlert({}, "hot"), { text: "", type: undefined })

assert.deepEqual(
  resolvePageAlert({ "hot.alertText": "  Hello  ", "hot.alertType": "warning" }, "hot"),
  { text: "Hello", type: "warning" },
)

assert.deepEqual(
  resolvePageAlert(
    { "egipet.alertText": "Legacy", "egipet.alertType": "warning", "country:avia:egipet.alertType": "info" },
    "country:avia:egipet",
    "egipet",
  ),
  { text: "Legacy", type: "warning" },
)

assert.deepEqual(
  resolvePageAlert(
    {
      "country:avia:egipet.alertText": "Primary",
      "country:avia:egipet.alertType": "info",
      "egipet.alertText": "Legacy",
      "egipet.alertType": "warning",
    },
    "country:avia:egipet",
    "egipet",
  ),
  { text: "Primary", type: "info" },
)

assert.deepEqual(
  resolvePageAlert({ "hot.alertText": "   ", "egipet.alertText": "X" }, "hot", "egipet"),
  { text: "X", type: undefined },
)

assert.deepEqual(resolvePageAlert({ "hot.alertText": "" }, "hot"), { text: "", type: undefined })

console.log("resolve-page-alert.selfcheck: ok")
