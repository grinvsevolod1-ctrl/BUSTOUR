/**
 * Settings/page save audit helpers.
 * Run: npx tsx scripts/settings-audit.selfcheck.ts
 */
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import {
  changedSettings,
  pickSettingsSubset,
  settingsAuditEntity,
} from "@/lib/admin-audit"

assert.deepEqual(pickSettingsSubset({ a: "1", b: "2" }, ["a", "c"]), {
  a: "1",
  c: "",
})

assert.deepEqual(
  changedSettings({ "hot.h1": "old", "hot.intro": "same" }, { "hot.h1": "new", "hot.intro": "same" }),
  { before: { "hot.h1": "old" }, after: { "hot.h1": "new" } },
)

assert.deepEqual(settingsAuditEntity(["hot.h1", "hot.intro"]), {
  entityType: "page",
  entityId: "hot",
  pageKey: "hot",
})
assert.deepEqual(settingsAuditEntity(["site.phone"]), {
  entityType: "settings",
  entityId: "site",
  pageKey: "site",
})
assert.equal(settingsAuditEntity(["hot.h1", "home.h1"]).entityType, "settings")

const cms = fs.readFileSync(
  path.join(import.meta.dirname, "../app/admin/cms-actions.ts"),
  "utf8",
)
assert.ok(cms.includes("writeAudit"), "saveSettingsAction must write audit")
assert.ok(cms.includes("settings_update"), "settings_update action name")
assert.ok(cms.includes("page_faqs_update"), "FAQ save audits")
assert.ok(cms.includes("block_update"), "block save audits")

console.log("settings-audit.selfcheck ok")
