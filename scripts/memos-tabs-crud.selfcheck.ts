/**
 * #96 — memos tabs CRUD against temp SQLite (create / save / reorder / delete / re-read).
 * Mirrors admin action data paths without requireAdmin / redirect.
 * Run: npx tsx scripts/memos-tabs-crud.selfcheck.ts
 */
import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import {import { hasSelfcheckPostgres, skipRuntimeMessage } from "./lib/selfcheck-db"

  MEMOS_PAGE_CMS_KEY,
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
} from "../lib/memos-page-cms"

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

/** Same orderedIds → shortKeys gate as reorderMemoTabsAction. */
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
  const nextOrder = orderedIds.map(shortKeyFromMemoSlotId).filter(isMemoSectionKey)
  if (nextOrder.length !== orderedIds.length) return null
  const currentSet = new Set(current)
  if (nextOrder.length !== current.length || nextOrder.some((k) => !currentSet.has(k))) return null
  return nextOrder
}

async function main() {
  const dbFile = path.join(os.tmpdir(), `bustour-memos-crud-${Date.now()}.db`)

  const { ensureDb } = await import("../lib/db/init")
  const { getSettings, saveSettings } = await import("../lib/cms")
  await ensureDb()

  try {
    await step("seed memos defaults into settings", async () => {
      await saveSettings(memosDefaultSettings())
      const settings = await getSettings()
      const order = resolveMemosTabsOrder(settings)
      assert.equal(order.length, 7)
      assert.equal(resolveMemoTabsFromSettings(settings).length, 7)
    })

    let createdKey = ""

    await step("create tab (next slot + visibility + tabs.order)", async () => {
      const settings = await getSettings()
      const order = resolveMemosTabsOrder(settings)
      createdKey = nextMemoSlotKey(order)
      assert.equal(createdKey, "memo8")
      const nextOrder = [...order.filter((k) => k !== createdKey), createdKey]
      await saveSettings({
        [`${MEMOS_PAGE_CMS_KEY}.section.${createdKey}`]: "1",
        [MEMOS_TABS_ORDER_KEY]: JSON.stringify(nextOrder),
      })
      const after = await getSettings()
      assert.ok(resolveMemosTabsOrder(after).includes(createdKey))
      assert.equal(after[`${MEMOS_PAGE_CMS_KEY}.section.${createdKey}`], "1")
    })

    const stamp = `CRUD-${Date.now()}`
    const fileHref = `/uploads/memos/selfcheck-${Date.now()}.pdf`

    await step("save label + heading + body + single file URL", async () => {
      const keys = memoSettingKeys(MEMOS_PAGE_CMS_KEY, createdKey)
      assert.ok(assertSingleMemoFile(fileHref))
      await saveSettings({
        [keys.label]: stamp,
        [keys.heading]: `Heading ${stamp}`,
        [keys.body]: `<p>${stamp}</p>`,
        [keys.file]: fileHref,
        [keys.fileTitle]: `File ${stamp}`,
      })
      const settings = await getSettings()
      assert.equal(settings[keys.label], stamp)
      assert.equal(settings[keys.file], fileHref)
      assert.ok(assertSingleMemoFile(settings[keys.file] || ""))
      const tabs = resolveMemoTabsFromSettings(settings)
      const tab = tabs.find((t) => t.id === createdKey)
      assert.ok(tab, "created tab visible in public resolve")
      assert.equal(tab!.label, stamp)
      assert.equal(tab!.fileHref, fileHref)
      const rows = memoAdminRows(settings)
      assert.ok(rows.some((r) => r.shortKey === createdKey && r.label === stamp && r.fileHref === fileHref))
    })

    await step("move tab up via moveMemoInOrder + persist", async () => {
      const settings = await getSettings()
      const order = resolveMemosTabsOrder(settings)
      assert.equal(order[order.length - 1], createdKey)
      const nextOrder = moveMemoInOrder(order, createdKey, -1)
      assert.notEqual(JSON.stringify(nextOrder), JSON.stringify(order))
      assert.equal(nextOrder[nextOrder.length - 2], createdKey)
      await saveSettings({ [MEMOS_TABS_ORDER_KEY]: JSON.stringify(nextOrder) })
      const after = resolveMemosTabsOrder(await getSettings())
      assert.deepEqual(after, nextOrder)
    })

    await step("reorder via FormData orderedIds (DnD path)", async () => {
      const settings = await getSettings()
      const current = resolveMemosTabsOrder(settings)
      const reversed = [...current].reverse()
      const formData = new FormData()
      formData.set(
        "orderedIds",
        JSON.stringify(reversed.map((k) => (k === "memo" ? 1 : Number(k.replace("memo", ""))))),
      )
      const nextOrder = parseReorderFormData(formData, current)
      assert.ok(nextOrder, "reorder FormData accepted")
      assert.deepEqual(nextOrder, reversed)
      await saveSettings({ [MEMOS_TABS_ORDER_KEY]: JSON.stringify(nextOrder!) })
      const after = resolveMemosTabsOrder(await getSettings())
      assert.deepEqual(after, reversed)
      const publicTabs = resolveMemoTabsFromSettings(await getSettings())
      assert.deepEqual(
        publicTabs.map((t) => t.id),
        reversed.filter((k) => {
          const vis = settings[`${MEMOS_PAGE_CMS_KEY}.section.${k}`]
          return vis !== "0"
        }),
      )
    })

    await step("delete tab (visibility 0 + drop from tabs.order)", async () => {
      const settings = await getSettings()
      const order = resolveMemosTabsOrder(settings)
      assert.ok(order.includes(createdKey))
      const nextOrder = order.filter((k) => k !== createdKey)
      await saveSettings({
        [`${MEMOS_PAGE_CMS_KEY}.section.${createdKey}`]: "0",
        [MEMOS_TABS_ORDER_KEY]: JSON.stringify(nextOrder),
      })
      const after = await getSettings()
      assert.ok(!resolveMemosTabsOrder(after).includes(createdKey))
      assert.equal(after[`${MEMOS_PAGE_CMS_KEY}.section.${createdKey}`], "0")
      const keys = memoSettingKeys(MEMOS_PAGE_CMS_KEY, createdKey)
      assert.equal(after[keys.label], stamp, "field values retained after soft-remove from list")
      const publicTabs = resolveMemoTabsFromSettings(after)
      assert.ok(!publicTabs.some((t) => t.id === createdKey), "deleted tab hidden from public")
      assert.ok(!memoAdminRows(after).some((r) => r.shortKey === createdKey))
    })

    await step("reject multi-file / JSON array for memo file key", async () => {
      assert.equal(assertSingleMemoFile('["a.pdf","b.pdf"]'), false)
      assert.equal(assertSingleMemoFile("/files/memos/ok.pdf"), true)
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
  console.log(skipRuntimeMessage("memos-tabs-crud.selfcheck.ts"))
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
