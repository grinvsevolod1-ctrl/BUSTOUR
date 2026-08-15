/**
 * Dictionary page CMS: SEO, dynamic chip tabs (memos clone), SortableTableBody.
 * Run: npx tsx scripts/dictionary-cms.selfcheck.ts
 * DB CRUD: npx tsx scripts/dictionary-tabs-crud.selfcheck.ts
 */
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import {
  DICTIONARY_PAGE_CMS_KEY,
  DICTIONARY_PAGE_SECTIONS_DEFAULT,
  DICTIONARY_TABS_ORDER_KEY,
  dictionaryAdminRows,
  dictionaryDefaultSettings,
  dictionarySettingKeys,
  isDictionarySectionKey,
  moveDictionaryInOrder,
  nextDictionarySlotKey,
  resolveDictionaryEntriesFromSettings,
  resolveDictionaryTabsOrder,
  shortKeyFromDictionarySlotId,
} from "@/lib/dictionary-page-cms"
import { pageSettingsGroups } from "@/lib/admin-config"

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const read = (rel: string) => fs.readFileSync(path.join(root, rel), "utf8")

const page = pageSettingsGroups.dictionary
assert.ok(page, "dictionary in pageSettingsGroups")
assert.equal(page.url, "/info/dictionary")

const seed = dictionaryDefaultSettings()
assert.ok(seed[DICTIONARY_TABS_ORDER_KEY])
assert.equal(
  seed["dictionary.sections.order"],
  JSON.stringify([...DICTIONARY_PAGE_SECTIONS_DEFAULT]),
)
assert.ok(
  !JSON.parse(seed["dictionary.sections.order"]!).some(isDictionarySectionKey),
  "sections.order has no term entries",
)

const order = resolveDictionaryTabsOrder(seed)
assert.equal(order.length, 3)
assert.ok(!order.includes("callus"))

const entries = resolveDictionaryEntriesFromSettings(seed, order)
assert.equal(entries.length, 3)
assert.equal(entries[0]!.label, "Аббревиатуры")
assert.ok(entries[0]!.body.includes("MR/MRS"))

assert.equal(dictionarySettingKeys(DICTIONARY_PAGE_CMS_KEY, "term2").body, "dictionary.termBody2")
assert.equal(shortKeyFromDictionarySlotId(1), "term")
assert.equal(shortKeyFromDictionarySlotId(3), "term3")

const publicPage = read("app/(site)/info/dictionary/page.tsx")
assert.ok(publicPage.includes("resolveDictionaryTabsOrder"))
assert.ok(publicPage.includes("metadataFromSettings"))
assert.ok(!publicPage.includes("dictionary.tab1"), "no fixed tab1 keys in public page")

const content = read("app/(site)/info/dictionary/dictionary-content.tsx")
assert.ok(content.includes("InfoTabsContent"), "reuses memos chip tabs")
assert.ok(!content.includes("aria-expanded"), "no accordion")
assert.ok(!content.includes("aside"), "no sidebar tabs")
assert.ok(!content.includes("ChevronRight"), "no sidebar chevron tabs")

const shared = read("components/site/info-tabs-content.tsx")
assert.ok(shared.includes('role="tablist"'), "chip tablist")
assert.ok(shared.includes("aria-selected"), "chip selected state")

const adminPage = read("app/admin/(protected)/pages/dictionary/page.tsx")
assert.ok(adminPage.includes("dictionary-list"), "entries table anchor")
assert.ok(adminPage.includes("DictionaryTabsTable"))
assert.ok(adminPage.includes("reorderDictionaryTabsAction"))
assert.ok(!adminPage.includes("Три фиксированных"), "no fixed-3 copy")

const table = read("components/admin/dictionary-tabs-table.tsx")
assert.ok(table.includes("SortableTableBody"))
assert.ok(table.includes("DragHandle"))
assert.ok(table.includes("SortOrderButtons"))

const editPage = read("app/admin/(protected)/pages/dictionary/[slot]/page.tsx")
assert.ok(editPage.includes("termBody") || editPage.includes("dictionarySettingKeys"))

assert.ok(read("app/admin/cms-actions.ts").includes("dictionary_tab_reorder"))

const rows = dictionaryAdminRows(seed, order)
assert.equal(rows.length, 3)
assert.equal(rows[0]!.shortKey, "term")

assert.equal(nextDictionarySlotKey(["term", "term2"]), "term3")
assert.deepEqual(moveDictionaryInOrder(["term", "term2", "term3"], "term2", -1), [
  "term2",
  "term",
  "term3",
])

const reordered = resolveDictionaryEntriesFromSettings(seed, ["term2", "term"])
assert.equal(reordered[0]!.label, "Термины")
assert.equal(reordered[1]!.label, "Аббревиатуры")

// legacy fallback: tab1..3 when tabs.order missing
const legacy = resolveDictionaryTabsOrder({
  "dictionary.tab1.label": "A",
  "dictionary.tab2.label": "B",
  "dictionary.tab3.body": "C",
})
assert.deepEqual(legacy, ["term", "term2", "term3"])

const legacyEntries = resolveDictionaryEntriesFromSettings({
  "dictionary.tab1.label": "Legacy A",
  "dictionary.tab1.body": "Body A",
  "dictionary.tab2.label": "Legacy B",
  "dictionary.tab2.body": "Body B",
})
assert.equal(legacyEntries[0]!.label, "Legacy A")
assert.equal(legacyEntries[1]!.label, "Legacy B")

const seedFile = read("lib/db/cms-seed.ts")
assert.ok(seedFile.includes("dictionaryDefaultSettings"))
assert.ok(!seedFile.includes("dictionary.tab1.label"), "seed uses modern keys only")

console.log("ok")
