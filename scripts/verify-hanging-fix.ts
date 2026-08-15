import { readFileSync } from "node:fs"
import path from "node:path"
import { createClient } from "@libsql/client"

for (const line of readFileSync(path.join(process.cwd(), ".env.local"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m) process.env[m[1]] ??= m[2]
}

async function main() {
  const c = createClient({ url: process.env.DATABASE_URL!, authToken: process.env.DATABASE_AUTH_TOKEN })
  const r = await c.execute(
    `SELECT id,slug,title,arrivalCityId,countryId,country FROM tours WHERE id BETWEEN 6 AND 12 ORDER BY id`,
  )
  for (const row of r.rows) console.log(JSON.stringify(row))

  const sql = await c.execute(`SELECT sql FROM sqlite_master WHERE type='table' AND name='tours'`)
  const ddl = String(sql.rows[0]?.sql ?? "")
  console.log("has CHECK", /CHECK\s*\(\s*arrivalCityId\s*<>\s*0\s*\)/i.test(ddl))
  console.log("arrivalCityId col:", ddl.match(/arrivalCityId[^,\n]+/)?.[0])

  const settings = await c.execute(
    `SELECT key, value FROM settings WHERE key LIKE '%testovyy%' OR key LIKE 'tour:11%' LIMIT 20`,
  )
  for (const row of settings.rows) console.log(row.key, "=", row.value)
}
main().catch((e) => {
  console.error(e)
  process.exit(1)
})
