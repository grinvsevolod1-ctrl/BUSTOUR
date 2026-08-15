/**
 * CLI twin of MCP send_notification → Telegram.
 * Same ergonomics as desktop mcp-notifications (title + message).
 *
 *   npx tsx scripts/telegram-notify.ts --title "Codex" --message "done"
 *   npx tsx scripts/telegram-notify.ts --title "Test" --body "alias of --message"
 *   npx tsx scripts/telegram-notify.ts --check
 */
import { existsSync, readFileSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"

const ENV_PATH = join(homedir(), ".cursor", "telegram-notifier.env")
const MAX_BODY = 3500

type Args = {
  title: string
  message: string
  check: boolean
  dryRun: boolean
  stdin: boolean
  silent: boolean
}

function parseArgs(argv: string[]): Args {
  const out: Args = {
    title: "Notify",
    message: "",
    check: false,
    dryRun: false,
    stdin: false,
    silent: false,
  }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === "--check") out.check = true
    else if (a === "--dry-run") out.dryRun = true
    else if (a === "--stdin") out.stdin = true
    else if (a === "--silent") out.silent = true
    else if (a === "--title") out.title = argv[++i] ?? out.title
    else if (a === "--message" || a === "--body") out.message = argv[++i] ?? ""
    else if (a === "--help" || a === "-h") {
      console.log(
        "Usage: npx tsx scripts/telegram-notify.ts --title T --message M [--silent] [--check] [--dry-run]\n" +
          "Drop-in for mcp-notifications send_notification (Telegram delivery).",
      )
      process.exit(0)
    }
  }
  return out
}

function loadEnvFile(path: string): Record<string, string> {
  if (!existsSync(path)) throw new Error(`Missing env file: ${path}`)
  const map: Record<string, string> = {}
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eq = trimmed.indexOf("=")
    if (eq <= 0) continue
    map[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim()
  }
  return map
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    process.stdin.on("data", (c) => chunks.push(Buffer.from(c)))
    process.stdin.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")))
    process.stdin.on("error", reject)
  })
}

async function sendTelegram(token: string, chatId: string, text: string, silent: boolean) {
  const url = `https://api.telegram.org/bot${token}/sendMessage`
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
      disable_notification: silent,
    }),
  })
  const json = (await res.json()) as { ok?: boolean; description?: string }
  if (!res.ok || !json.ok) {
    throw new Error(`Telegram API ${res.status}: ${json.description ?? res.statusText}`)
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const env = loadEnvFile(ENV_PATH)
  const token = env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || ""
  const chatId = env.TELEGRAM_CHAT_ID || process.env.TELEGRAM_CHAT_ID || ""

  if (!token) throw new Error("TELEGRAM_BOT_TOKEN empty")
  if (!chatId) throw new Error("TELEGRAM_CHAT_ID empty")
  if (!/^\d+:[A-Za-z0-9_-]+$/.test(token)) {
    throw new Error("TELEGRAM_BOT_TOKEN format invalid (expect digits:token)")
  }
  if (!/^-?\d+$/.test(chatId)) {
    throw new Error("TELEGRAM_CHAT_ID must be numeric")
  }

  if (args.check) {
    console.log(`telegram-notify: ok env (${ENV_PATH})`)
    return
  }

  let message = args.message
  if (args.stdin) message = (await readStdin()).trim()
  if (!message) throw new Error("Empty message: pass --message/--body or --stdin")

  if (message.length > MAX_BODY) {
    message = `${message.slice(0, MAX_BODY - 20)}\n…(truncated)`
  }

  const stamp = new Date().toLocaleString("ru-RU", { timeZone: "Europe/Minsk" })
  const text = `<b>${escapeHtml(args.title)}</b>\n<code>${escapeHtml(stamp)}</code>\n\n${escapeHtml(message)}`

  if (args.dryRun) {
    console.log(text)
    console.log("Notification queued")
    return
  }

  await sendTelegram(token, chatId, text, args.silent)
  // Same success string as mcp-notifications / Telegram MCP drop-in
  console.log("Notification queued")
}

main().catch((err) => {
  console.error(`telegram-notify: ${err instanceof Error ? err.message : String(err)}`)
  process.exit(1)
})
