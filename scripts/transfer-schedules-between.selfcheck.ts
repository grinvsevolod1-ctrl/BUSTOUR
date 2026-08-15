/**
 * Per-direction schedule CMS blocks (title / before / after); no between-tables card.
 * Run: npx tsx scripts/transfer-schedules-between.selfcheck.ts
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import {
  resolveTransferScheduleTitle,
  transferScheduleCmsKeys,
  TRANSFER_SCHEDULE_DEFAULT_TITLES,
} from "../lib/transfer-display"

assert.equal(
  TRANSFER_SCHEDULE_DEFAULT_TITLES.outbound,
  "Расписание из Минска в аэропорт",
)
assert.equal(
  TRANSFER_SCHEDULE_DEFAULT_TITLES.return,
  "Расписание из аэропорта в Минск",
)

const keys = transferScheduleCmsKeys("transfer:sheremetyevo", "outbound")
assert.equal(keys.title, "transfer:sheremetyevo.schedule.outbound.title")
assert.equal(keys.beforeHtml, "transfer:sheremetyevo.schedule.outbound.beforeHtml")
assert.equal(keys.afterTitle, "transfer:sheremetyevo.schedule.outbound.afterTitle")
assert.equal(keys.afterHtml, "transfer:sheremetyevo.schedule.outbound.afterHtml")

assert.equal(
  resolveTransferScheduleTitle({}, "transfer:x", "outbound"),
  TRANSFER_SCHEDULE_DEFAULT_TITLES.outbound,
)
assert.equal(
  resolveTransferScheduleTitle(
    { "transfer:x.schedule.outbound.title": "  Свой заголовок  " },
    "transfer:x",
    "outbound",
  ),
  "Свой заголовок",
)

const root = process.cwd()
const admin = readFileSync(join(root, "app/admin/(protected)/transfers/[id]/page.tsx"), "utf8")
assert.doesNotMatch(admin, /schedulesBetweenHtml|Текст между таблицами/, "between card removed")

const editor = readFileSync(join(root, "components/admin/transfer-schedule-editor.tsx"), "utf8")
assert.match(editor, /beforeHtml|afterHtml|schedule\./, "editor has per-direction CMS fields")
assert.match(editor, /placeholder|DEFAULT|resolveTransferScheduleTitle|TRANSFER_SCHEDULE/, "editable title with default placeholder")

const pub = readFileSync(join(root, "app/(site)/info/transfers/[slug]/page.tsx"), "utf8")
assert.doesNotMatch(pub, /schedulesBetweenHtml/, "public no between block")
assert.match(pub, /resolveTransferScheduleTitle|schedule\.outbound|beforeHtml/, "public uses schedule CMS blocks")

console.log("transfer-schedules-between.selfcheck: ok")
