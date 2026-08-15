/**
 * Transfer schedules admin density UX.
 * Run: npx tsx scripts/transfer-schedules-dense.selfcheck.ts
 */
import assert from "node:assert/strict"
import { readFileSync, existsSync } from "node:fs"
import { join } from "node:path"
import {
  parseScheduleDirectionHash,
  scheduleDirectionAnchor,
} from "../lib/transfer-schedule-admin"

const root = process.cwd()
const read = (p: string) => readFileSync(join(root, p), "utf8")

assert.equal(parseScheduleDirectionHash("#transfer-schedules-outbound"), "outbound")
assert.equal(parseScheduleDirectionHash("transfer-schedules-return"), "return")
assert.equal(parseScheduleDirectionHash("#transfer-schedules"), "outbound")
assert.equal(scheduleDirectionAnchor("return"), "transfer-schedules-return")

assert.ok(existsSync(join(root, "components/admin/transfer-schedules-panel.tsx")))
const panel = read("components/admin/transfer-schedules-panel.tsx")
assert.match(panel, /transfer-schedules-outbound/)
assert.match(panel, /transfer-schedules-return/)
assert.match(panel, /Из Минска/)
assert.match(panel, /role="tablist"/)

const page = read("app/admin/(protected)/transfers/[id]/page.tsx")
assert.match(page, /TransferSchedulesPanel/)
assert.match(page, /transfer-schedules-outbound/)
assert.match(page, /transfer-schedules-return/)
assert.doesNotMatch(
  page,
  /TransferScheduleEditor\s*\n[\s\S]*TransferScheduleEditor/,
  "page must use panel, not two stacked editors",
)

const editor = read("components/admin/transfer-schedule-editor.tsx")
assert.match(editor, /hidden md:block/)
assert.match(editor, /md:hidden/)
assert.match(editor, /type="time"/)
assert.match(editor, /p-1\.5/)
assert.match(editor, /collapseEmpty/)

const rich = read("components/admin/rich-editor.tsx")
assert.match(rich, /collapseEmpty/)
assert.match(rich, /Развернуть/)

const fields = read("components/admin/section-fields-form.tsx")
assert.match(fields, /collapseEmpty/)

const config = read("lib/admin-config.ts")
assert.match(config, /collapseEmpty\?:/)

const psf = read("components/admin/page-settings-form.tsx")
assert.match(psf, /metaKey|ctrlKey/)
assert.match(psf, /KeyS|key === ["']s["']/i)

console.log("transfer-schedules-dense.selfcheck: ok")
