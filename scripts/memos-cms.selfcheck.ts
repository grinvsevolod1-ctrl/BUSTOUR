/**
 * #96 — memos page CMS: SEO, dynamic memo tabs, SortableTableBody, single file.
 * Run: npx tsx scripts/memos-cms.selfcheck.ts
 * DB CRUD: npx tsx scripts/memos-tabs-crud.selfcheck.ts (or npm run test:memos)
 */
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import {
  MEMOS_PAGE_CMS_KEY,
  MEMOS_PAGE_SECTIONS_DEFAULT,
  MEMOS_TABS_ORDER_KEY,
  assertSingleMemoFile,
  isMemoSectionKey,
  memoAdminRows,
  memoSettingKeys,
  memosDefaultSettings,
  moveMemoInOrder,
  nextMemoSlotKey,
  resolveMemoTabsFromSettings,
  resolveMemosTabsOrder,
  shortKeyFromMemoSlotId,
} from "@/lib/memos-page-cms"
import { isMultipliableSectionBase, getSectionDef } from "@/lib/section-registry"
import { pageSettingsGroups } from "@/lib/admin-config"

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const read = (rel: string) => fs.readFileSync(path.join(root, rel), "utf8")

assert.ok(isMultipliableSectionBase("memo"))
assert.equal(getSectionDef("memo")?.allowMultiple, true)

const page = pageSettingsGroups.memos
assert.ok(page, "memos in pageSettingsGroups")
assert.equal(page.url, "/info/memos")

const seed = memosDefaultSettings()
assert.ok(seed[MEMOS_TABS_ORDER_KEY])
assert.equal(seed["memos.sections.order"], JSON.stringify([...MEMOS_PAGE_SECTIONS_DEFAULT]))
assert.ok(!JSON.parse(seed["memos.sections.order"]!).some(isMemoSectionKey), "sections.order has no memo tabs")

const order = resolveMemosTabsOrder(seed)
assert.ok(order.filter(isMemoSectionKey).length >= 7, "default memo tabs")
assert.ok(!order.includes("callus"))

const tabs = resolveMemoTabsFromSettings(seed, order)
assert.equal(tabs.length, 7)
assert.ok(tabs[0]!.fileHref.includes("/files/memos/"))
assert.ok(tabs.every((t) => assertSingleMemoFile(t.fileHref)))

assert.equal(assertSingleMemoFile(""), true)
assert.equal(assertSingleMemoFile("/files/memos/turkey.pdf"), true)
assert.equal(assertSingleMemoFile('["a","b"]'), false)

assert.equal(memoSettingKeys(MEMOS_PAGE_CMS_KEY, "memo2").file, "memos.memoFile2")
assert.equal(shortKeyFromMemoSlotId(1), "memo")
assert.equal(shortKeyFromMemoSlotId(3), "memo3")

const publicPage = read("app/(site)/info/memos/page.tsx")
assert.ok(!publicPage.includes("turkey.pdf"), "no hardcode file names in public page")
assert.ok(publicPage.includes("resolveMemosTabsOrder"))
assert.ok(publicPage.includes("metadataFromSettings"))

const adminPage = read("app/admin/(protected)/pages/memos/page.tsx")
assert.ok(adminPage.includes("memos-list"), "tabs table anchor")
assert.ok(adminPage.includes("MemosTabsTable"))
assert.ok(adminPage.includes("reorderMemoTabsAction"))
assert.ok(adminPage.includes("SortableTableBody") || read("components/admin/memos-tabs-table.tsx").includes("SortableTableBody"))
assert.ok(!adminPage.includes("Вкладка памятки"), "no memo section in PageSectionsManager catalog")
assert.ok(adminPage.includes("Частые вопросы"))
assert.ok(adminPage.includes("Есть вопросы"))

const table = read("components/admin/memos-tabs-table.tsx")
assert.ok(table.includes("SortableTableBody"))
assert.ok(table.includes("DragHandle"))
assert.ok(table.includes("SortOrderButtons"))

const editPage = read("app/admin/(protected)/pages/memos/[slot]/page.tsx")
assert.ok(editPage.includes('mediaAccept: ["document"]'))

assert.ok(read("app/admin/cms-actions.ts").includes("memo_tab_reorder"))

const rows = memoAdminRows(seed, order)
assert.equal(rows.length, 7)
assert.equal(rows[0]!.shortKey, "memo")

assert.equal(nextMemoSlotKey(["memo", "memo2"]), "memo3")
assert.deepEqual(moveMemoInOrder(["memo", "memo2", "memo3"], "memo2", -1), ["memo2", "memo", "memo3"])

const reordered = resolveMemoTabsFromSettings(seed, ["memo2", "memo"])
assert.equal(reordered[0]!.label, "Египет")
assert.equal(reordered[1]!.label, "Турция")

// legacy fallback: tabs from sections.order when tabs.order missing
const legacy = resolveMemosTabsOrder({
  "memos.sections.order": JSON.stringify(["memo3", "memo", "callus"]),
})
assert.deepEqual(legacy, ["memo3", "memo"])

console.log("memos-cms.selfcheck: ok")
