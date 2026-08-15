/**
 * List tours with missing / zero arrivalCityId (local or Turso via .env.local).
 * Run: npx tsx scripts/list-hanging-tours.ts
 */
import { readFileSync, existsSync } from "node:fs"
import path from "node:path"
import { createClient } from "@libsql/client"

function loadEnvLocal() {
  const p = path.join(process.cwd(), ".env.local")
  if (!existsSync(p)) return
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (!m) continue
    process.env[m[1]] ??= m[2]
  }
}

async function main() {
  loadEnvLocal()
  const url = process.env.DATABASE_URL || `file:${path.join(process.cwd(), "data", "app.db")}`
  const authToken = process.env.DATABASE_AUTH_TOKEN
  console.log("db", url.startsWith("file:") ? url : url.replace(/\/\/.*@/, "//***@").slice(0, 60))

  const c = createClient({ url, authToken })
  const hanging = await c.execute(`
    SELECT t.id, t.title, t.slug, t.arrivalCityId, t.countryId, t.archived,
           COALESCE(co.name, '') AS country
    FROM tours t
    LEFT JOIN countries co ON co.id = t.countryId
    WHERE t.arrivalCityId IS NULL OR t.arrivalCityId <= 0
    ORDER BY t.id
  `)
  console.log("hanging", hanging.rows.length)
  for (const r of hanging.rows) {
    console.log(
      `#${r.id} city=${r.arrivalCityId} country=${r.countryId}:${r.country} archived=${r.archived} slug=${r.slug} ${r.title}`,
    )
  }

  // Also: arrivalCityId points at missing city
  const orphan = await c.execute(`
    SELECT t.id, t.title, t.arrivalCityId
    FROM tours t
    LEFT JOIN city_destinations c ON c.id = t.arrivalCityId
    WHERE t.arrivalCityId > 0 AND c.id IS NULL
    ORDER BY t.id
  `)
  console.log("orphan city FK", orphan.rows.length)
  for (const r of orphan.rows) console.log(`#${r.id} city=${r.arrivalCityId} ${r.title}`)

  const cities = await c.execute(`
    SELECT id, name, slug, category, country, countryId
    FROM city_destinations WHERE archived = 0 ORDER BY id
  `)
  console.log("active cities", cities.rows.length)
  for (const r of cities.rows) {
    console.log(`city #${r.id} [${r.category}] ${r.name} (${r.slug}) country=${r.countryId}:${r.country}`)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
