import { readFileSync } from "node:fs"
import path from "node:path"
import { createClient } from "@libsql/client"

for (const line of readFileSync(path.join(process.cwd(), ".env.local"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m) process.env[m[1]] ??= m[2]
}

async function main() {
  const c = createClient({ url: process.env.DATABASE_URL!, authToken: process.env.DATABASE_AUTH_TOKEN })
  const r = await c.execute("SELECT id,name,slug,category,archived FROM countries ORDER BY id")
  for (const row of r.rows) console.log(`${row.id}\t${row.category}\t${row.archived}\t${row.name}\t${row.slug}`)
}
main().catch((e) => {
  console.error(e)
  process.exit(1)
})
