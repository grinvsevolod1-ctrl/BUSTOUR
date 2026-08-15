import { readFileSync } from "node:fs"
import { createClient } from "@libsql/client"

function loadEnvLocal() {
  const raw = readFileSync(".env.local", "utf8")
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (!m) continue
    process.env[m[1]] ??= m[2]
  }
}

async function main() {
  loadEnvLocal()
  const url = process.env.DATABASE_URL
  const authToken = process.env.DATABASE_AUTH_TOKEN
  if (!url || !authToken) {
    console.error("missing DATABASE_URL or DATABASE_AUTH_TOKEN")
    process.exit(1)
  }

  const c = createClient({ url, authToken })
  const r = await c.execute("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY 1")
  console.log("ok tables=" + r.rows.length)
  console.log(r.rows.map((row) => String(row.name)).join(","))
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
