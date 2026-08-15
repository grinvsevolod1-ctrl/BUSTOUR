/**
 * Scan tour_dates for endDate < startDate (and empty halves).
 * Run: npx tsx scripts/scan-date-ranges.ts
 */
import { readFileSync, existsSync } from "node:fs"
import path from "node:path"
import { createClient } from "@libsql/client"

function loadEnvLocal() {
  const p = path.join(process.cwd(), ".env.local")
  if (!existsSync(p)) return
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m) process.env[m[1]] ??= m[2]
  }
}

async function main() {
  loadEnvLocal()
  const url = process.env.DATABASE_URL || `file:${path.join(process.cwd(), "data", "app.db")}`
  const c = createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN })

  const invalid = await c.execute(`
    SELECT d.id, d.tourId, d.startDate, d.endDate, t.title
    FROM tour_dates d
    LEFT JOIN tours t ON t.id = d.tourId
    WHERE d.startDate <> '' AND d.endDate <> '' AND d.endDate < d.startDate
    ORDER BY d.tourId, d.id
  `)
  console.log("invalid endDate < startDate:", invalid.rows.length)
  for (const row of invalid.rows) console.log(JSON.stringify(row))

  const emptyHalf = await c.execute(`
    SELECT COUNT(*) AS c FROM tour_dates
    WHERE (startDate = '' AND endDate <> '') OR (startDate <> '' AND endDate = '')
  `)
  console.log("half-empty ranges:", emptyHalf.rows[0]?.c)

  const total = await c.execute(`SELECT COUNT(*) AS c FROM tour_dates`)
  console.log("total tour_dates:", total.rows[0]?.c)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
