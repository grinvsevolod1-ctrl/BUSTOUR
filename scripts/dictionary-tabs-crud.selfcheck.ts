/**
 * Dictionary tabs CRUD against temp SQLite (create / save / reorder / delete / re-read).
 * Run: npx tsx scripts/dictionary-tabs-crud.selfcheck.ts
 */
import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import {import { hasSelfcheckPostgres, skipRuntimeMessage } from "./lib/selfcheck-db"

  DICTIONARY_PAGE_CMS_KEY,
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
} from "../lib/dictionary-page-cms"

const GREEN = "\x1b[32m"
const RED = "\x1b[31m"
const RESET = "\x1b[0m"
const ok = (msg: string) => console.log(`${GREEN}✓${RESET} ${msg}`)

async function step(label: string, fn: () => Promise<void>) {
  try {
    await fn()
    ok(label)
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    console.log(`${RED}✗${RESET} ${label}: ${detail}`)
    throw err
  }
}

function parseReorderFormData(formData: FormData, current: string[]): string[] | null {
  let orderedIds: number[] = []
  try {
    const parsed = JSON.parse(String(formData.get("orderedIds") || "[]"))
    orderedIds = Array.isArray(parsed)
      ? parsed.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0)
      : []
  } catch {
    orderedIds = []
  }
  if (orderedIds.length < 2) return null
  const nextOrder = orderedIds.map(shortKeyFromDictionarySlotId).filter(isDictionarySectionKey)
  if (nextOrder.length !== orderedIds.length) return null
  const currentSet = new Set(current)
  if (nextOrder.length !== current.length || nextOrder.some((k) => !currentSet.has(k))) return null
  return nextOrder
}

async function main() {
  const dbFile = path.join(os.tmpdir(), `bustour-dictionary-crud-${Date.now()}.db`)

  const { ensureDb } = await import("../lib/db/init")
  const { getSettings, saveSettings } = await import("../lib/cms")
  await ensureDb()

  try {
    await step("seed dictionary defaults into settings", async () => {
      await saveSettings(dictionaryDefaultSettings())
      const settings = await getSettings()
      const order = resolveDictionaryTabsOrder(settings)
      assert.equal(order.length, 3)
      assert.equal(resolveDictionaryEntriesFromSettings(settings).length, 3)
    })

    let createdKey = ""

    await step("create entry (next slot + visibility + tabs.order)", async () => {
      const settings = await getSettings()
      const order = resolveDictionaryTabsOrder(settings)
      createdKey = nextDictionarySlotKey(order)
      assert.equal(createdKey, "term4")
      const nextOrder = [...order.filter((k) => k !== createdKey), createdKey]
      await saveSettings({
        [`${DICTIONARY_PAGE_CMS_KEY}.section.${createdKey}`]: "1",
        [DICTIONARY_TABS_ORDER_KEY]: JSON.stringify(nextOrder),
      })
      const after = await getSettings()
      assert.ok(resolveDictionaryTabsOrder(after).includes(createdKey))
      assert.equal(after[`${DICTIONARY_PAGE_CMS_KEY}.section.${createdKey}`], "1")
    })

    const stamp = `DICT-${Date.now()}`

    await step("save label + heading + body", async () => {
      const keys = dictionarySettingKeys(DICTIONARY_PAGE_CMS_KEY, createdKey)
      await saveSettings({
        [keys.label]: stamp,
        [keys.heading]: `Heading ${stamp}`,
        [keys.body]: `Body\n${stamp}`,
      })
      const settings = await getSettings()
      assert.equal(settings[keys.label], stamp)
      const entries = resolveDictionaryEntriesFromSettings(settings)
      const entry = entries.find((t) => t.id === createdKey)
      assert.ok(entry, "created entry visible in public resolve")
      assert.equal(entry!.label, stamp)
      assert.ok(entry!.body.includes(stamp))
      const rows = dictionaryAdminRows(settings)
      assert.ok(rows.some((r) => r.shortKey === createdKey && r.label === stamp))
    })

    await step("move entry up via moveDictionaryInOrder + persist", async () => {
      const settings = await getSettings()
      const order = resolveDictionaryTabsOrder(settings)
      assert.equal(order[order.length - 1], createdKey)
      const nextOrder = moveDictionaryInOrder(order, createdKey, -1)
      assert.notEqual(JSON.stringify(nextOrder), JSON.stringify(order))
      assert.equal(nextOrder[nextOrder.length - 2], createdKey)
      await saveSettings({ [DICTIONARY_TABS_ORDER_KEY]: JSON.stringify(nextOrder) })
      const after = resolveDictionaryTabsOrder(await getSettings())
      assert.deepEqual(after, nextOrder)
    })

    await step("reorder via FormData orderedIds (DnD path)", async () => {
      const settings = await getSettings()
      const current = resolveDictionaryTabsOrder(settings)
      const reversed = [...current].reverse()
      const formData = new FormData()
      formData.set(
        "orderedIds",
        JSON.stringify(
          reversed.map((k) => (k === "term" ? 1 : Number(k.replace("term", "")))),
        ),
      )
      const nextOrder = parseReorderFormData(formData, current)
      assert.ok(nextOrder, "reorder FormData accepted")
      assert.deepEqual(nextOrder, reversed)
      await saveSettings({ [DICTIONARY_TABS_ORDER_KEY]: JSON.stringify(nextOrder!) })
      const after = resolveDictionaryTabsOrder(await getSettings())
      assert.deepEqual(after, reversed)
    })

    await step("delete entry (visibility 0 + drop from tabs.order)", async () => {
      const settings = await getSettings()
      const order = resolveDictionaryTabsOrder(settings)
      assert.ok(order.includes(createdKey))
      const nextOrder = order.filter((k) => k !== createdKey)
      await saveSettings({
        [`${DICTIONARY_PAGE_CMS_KEY}.section.${createdKey}`]: "0",
        [DICTIONARY_TABS_ORDER_KEY]: JSON.stringify(nextOrder),
      })
      const after = await getSettings()
      assert.ok(!resolveDictionaryTabsOrder(after).includes(createdKey))
      assert.equal(after[`${DICTIONARY_PAGE_CMS_KEY}.section.${createdKey}`], "0")
      const keys = dictionarySettingKeys(DICTIONARY_PAGE_CMS_KEY, createdKey)
      assert.equal(after[keys.label], stamp, "field values retained after soft-remove")
      const publicEntries = resolveDictionaryEntriesFromSettings(after)
      assert.ok(!publicEntries.some((t) => t.id === createdKey), "deleted entry hidden")
      assert.ok(!dictionaryAdminRows(after).some((r) => r.shortKey === createdKey))
    })

    console.log("ok")
  } finally {
    try {
      fs.unlinkSync(dbFile)
    } catch {
      /* ignore */
    }
  }
}

if (!hasSelfcheckPostgres()) {
  console.log(skipRuntimeMessage("dictionary-tabs-crud.selfcheck.ts"))
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
