/**
 * Config + CLI contract for telegram-notify (send_notification drop-in).
 * Run: npx tsx scripts/telegram-notify.selfcheck.ts
 */
import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { spawnSync } from "node:child_process"

const root = process.cwd()
const script = join(root, "scripts", "telegram-notify.ts")
const mcpServer = join(root, "tools", "telegram-notifications-mcp", "server.mjs")
const mcpPkg = join(root, "tools", "telegram-notifications-mcp", "package.json")

assert.ok(existsSync(script), "scripts/telegram-notify.ts missing")
assert.ok(existsSync(mcpServer), "tools/telegram-notifications-mcp/server.mjs missing")
assert.ok(existsSync(mcpPkg), "tools/telegram-notifications-mcp/package.json missing")

const src = readFileSync(script, "utf8")
assert.match(src, /--message/)
assert.match(src, /Notification queued/)

const mcp = readFileSync(mcpServer, "utf8")
assert.match(mcp, /send_notification/)
assert.match(mcp, /Notification queued/)
assert.match(mcp, /telegram-notifier\.env/)

const dry = spawnSync(
  process.execPath,
  [
    join(root, "node_modules", "tsx", "dist", "cli.mjs"),
    "scripts/telegram-notify.ts",
    "--dry-run",
    "--title",
    "selfcheck",
    "--message",
    "ping",
  ],
  { cwd: root, encoding: "utf8", shell: false },
)
// fallback if tsx path differs
const dry2 =
  dry.status === 0
    ? dry
    : spawnSync("npx", ["tsx", "scripts/telegram-notify.ts", "--dry-run", "--title", "selfcheck", "--message", "ping"], {
        cwd: root,
        encoding: "utf8",
        shell: true,
      })

assert.equal(dry2.status, 0, dry2.stderr || dry2.stdout)
assert.match(dry2.stdout, /Notification queued/)

console.log("telegram-notify.selfcheck: ok")
