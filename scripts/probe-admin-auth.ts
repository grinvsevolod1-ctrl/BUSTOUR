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
  const c = createClient({
    url: process.env.DATABASE_URL!,
    authToken: process.env.DATABASE_AUTH_TOKEN!,
  })
  const admins = await c.execute("SELECT id, username FROM admins ORDER BY id")
  console.log("admins=" + admins.rows.length)
  for (const row of admins.rows) console.log(`id=${row.id} user=${row.username}`)
  const hasAuth = Boolean(process.env.AUTH_SECRET?.trim())
  console.log("local_AUTH_SECRET_set=" + hasAuth)
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})
