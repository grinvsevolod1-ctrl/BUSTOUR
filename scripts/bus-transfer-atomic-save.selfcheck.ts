import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { readQueriesSource } from "./lib/read-queries-source"

function splitTransactionBlocks(body: string): string[] {
  const blocks: string[] = []
  const openToken = "db.transaction(async "
  let idx = 0
  while ((idx = body.indexOf(openToken, idx)) !== -1) {
    const start = idx
    const openBrace = body.indexOf("{", idx)
    if (openBrace < 0) break
    let depth = 1
    let i = openBrace + 1
    while (i < body.length && depth > 0) {
      const ch = body[i]
      if (ch === "{") depth++
      else if (ch === "}") depth--
      if (depth === 0) break
      i++
    }
    blocks.push(body.slice(start, i + 1))
    idx = i + 1
  }
  return blocks
}

async function main() {
  const root = path.resolve(__dirname, "..")
  const actionsSrc = fs.readFileSync(path.join(root, "app", "admin", "actions.ts"), "utf8")
  const queriesSrc = readQueriesSource(root)

  assert.match(
    queriesSrc,
    /export async function createBus\([^)]*executor\s*:\s*DbExecutor\s*=\s*db/,
    "createBus accepts executor param for transactions",
  )
  assert.match(
    queriesSrc,
    /export async function updateBus\([^)]*executor\s*:\s*DbExecutor\s*=\s*db/,
    "updateBus accepts executor param for transactions",
  )
  assert.match(
    queriesSrc,
    /export async function createTransfer\([^)]*executor\s*:\s*DbExecutor\s*=\s*db/,
    "createTransfer accepts executor param for transactions",
  )
  assert.match(
    queriesSrc,
    /export async function updateTransfer\([^)]*executor\s*:\s*DbExecutor\s*=\s*db/,
    "updateTransfer accepts executor param for transactions",
  )

  const saveBusIdx = actionsSrc.indexOf("export async function saveBusAction")
  assert.ok(saveBusIdx > 0, "saveBusAction present")
  const saveBusBody = actionsSrc.slice(
    saveBusIdx,
    Math.min(
      actionsSrc.indexOf("export async function", saveBusIdx + 100),
      saveBusIdx + 4500,
    ),
  )
  const saveBusTxMatches = splitTransactionBlocks(saveBusBody)
  assert.ok(saveBusTxMatches.length >= 2, `saveBusAction: 2+ tx blocks (update + create), found ${saveBusTxMatches.length}`)
  const hasBusUpdateTx = saveBusTxMatches.some(
    (m) => /rekeyPageScopedContent\(`bus:\$\{existing\.slug\}`/.test(m) && /updateBus\(id,\s*input,\s*tx\)/.test(m),
  )
  assert.ok(hasBusUpdateTx, "saveBusAction update tx: rekey + updateBus share same tx")
  const hasBusCreateTx = saveBusTxMatches.some(
    (m) => /createBus\(input,\s*tx\)/.test(m) && /bus:\$\{input\.slug\}\.visible/.test(m) && /saveSettings\s*\(/.test(m),
  )
  assert.ok(hasBusCreateTx, "saveBusAction create tx: createBus + saveSettings visible/callus defaults share same tx")

  const saveTransferIdx = actionsSrc.indexOf("export async function saveTransferAction")
  assert.ok(saveTransferIdx > 0, "saveTransferAction present")
  const saveTransferBody = actionsSrc.slice(
    saveTransferIdx,
    Math.min(
      actionsSrc.indexOf("export async function", saveTransferIdx + 100),
      saveTransferIdx + 5200,
    ),
  )
  const transferTxMatches = splitTransactionBlocks(saveTransferBody)
  assert.ok(transferTxMatches.length >= 2, `saveTransferAction: 2+ tx blocks, found ${transferTxMatches.length}`)
  const hasTransferUpdateTx = transferTxMatches.some(
    (m) => /rekeyPageScopedContent\(`transfer:\$\{existing\.slug\}`/.test(m) && /updateTransfer\(id,\s*input,\s*tx\)/.test(m),
  )
  assert.ok(hasTransferUpdateTx, "saveTransferAction update tx: rekey + updateTransfer share same tx")
  const hasTransferCreateTx = transferTxMatches.some(
    (m) => /createTransfer\(input,\s*tx\)/.test(m) && /transfer:\$\{input\.slug\}\.visible/.test(m) && /saveSettings\s*\(/.test(m),
  )
  assert.ok(hasTransferCreateTx, "saveTransferAction create tx: createTransfer + saveSettings defaults atomic")

  console.log("OK: 8/8 bus + transfer transactional save contracts + executor params all present")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
