import { createClient } from "@libsql/client"
import path from "node:path"
import fs from "node:fs"

async function main() {
  const dbPath = path.join(process.cwd(), "data", "app.db")
  if (!fs.existsSync(dbPath)) {
    console.log(JSON.stringify({ error: "NO_DB", path: dbPath }))
    return
  }

  const c = createClient({ url: `file:${dbPath}` })
  const tables = await c.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
  const indexes = await c.execute(
    "SELECT name, tbl_name, sql FROM sqlite_master WHERE type='index' AND sql IS NOT NULL ORDER BY tbl_name, name",
  )
  const counts: { table: string; rows: number }[] = []
  for (const t of tables.rows) {
    const name = String(t.name)
    if (name.startsWith("sqlite_")) continue
    const r = await c.execute(`SELECT COUNT(*) as c FROM "${name}"`)
    counts.push({ table: name, rows: Number(r.rows[0]!.c) })
  }
  const journal = await c.execute("PRAGMA journal_mode")
  const fk = await c.execute("PRAGMA foreign_keys")
  const page = await c.execute("PRAGMA page_count")
  const psize = await c.execute("PRAGMA page_size")
  const sync = await c.execute("PRAGMA synchronous")
  const autoVac = await c.execute("PRAGMA auto_vacuum")
  const fkList = await c.execute("PRAGMA foreign_key_list(city_destinations)")
  const toursFk = await c.execute("PRAGMA foreign_key_list(tours)")

  const explains: Record<string, unknown> = {}
  const plans: Array<[string, string]> = [
    ["tours_archived", "EXPLAIN QUERY PLAN SELECT id FROM tours WHERE archived = 0"],
    ["tours_cat", "EXPLAIN QUERY PLAN SELECT id FROM tours WHERE archived = 0 AND category = 'bus'"],
    ["tours_featured", "EXPLAIN QUERY PLAN SELECT id FROM tours WHERE archived = 0 AND featured = 1"],
    ["settings_all", "EXPLAIN QUERY PLAN SELECT key, value FROM settings"],
    ["settings_like", "EXPLAIN QUERY PLAN SELECT key FROM settings WHERE key LIKE 'hot.%'"],
    [
      "content_blocks_faq",
      "EXPLAIN QUERY PLAN SELECT id FROM content_blocks WHERE collection = 'faq' AND page = 'hot' AND visible = 1",
    ],
    [
      "reviews_approved",
      "EXPLAIN QUERY PLAN SELECT id FROM reviews WHERE approved = 1 AND archived = 0",
    ],
    ["tour_dates", "EXPLAIN QUERY PLAN SELECT id FROM tour_dates WHERE tourId = 1"],
    [
      "city_cat",
      "EXPLAIN QUERY PLAN SELECT id FROM city_destinations WHERE category = 'avia' AND archived = 0",
    ],
    ["transfer_sched", "EXPLAIN QUERY PLAN SELECT id FROM transfer_schedules WHERE transferId = 1"],
    ["certificates_sec", "EXPLAIN QUERY PLAN SELECT id FROM certificates WHERE sectionId = 1"],
    ["leads_arch", "EXPLAIN QUERY PLAN SELECT id FROM leads WHERE archived = 0"],
  ]
  for (const [name, sql] of plans) {
    try {
      explains[name] = (await c.execute(sql)).rows
    } catch (e) {
      explains[name] = String(e)
    }
  }

  const pageCount = Number((page.rows[0] as { page_count: number }).page_count)
  const pageSize = Number((psize.rows[0] as { page_size: number }).page_size)

  console.log(
    JSON.stringify(
      {
        path: dbPath,
        sizeBytes: fs.statSync(dbPath).size,
        journal: journal.rows[0],
        foreign_keys: fk.rows[0],
        synchronous: sync.rows[0],
        auto_vacuum: autoVac.rows[0],
        pages: pageCount,
        page_size: pageSize,
        approx_mb: ((pageCount * pageSize) / 1024 / 1024).toFixed(2),
        tables: counts.sort((a, b) => b.rows - a.rows),
        indexes: indexes.rows.map((r) => ({ name: r.name, table: r.tbl_name })),
        city_destinations_fks: fkList.rows,
        tours_fks: toursFk.rows,
        explains,
      },
      null,
      2,
    ),
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
