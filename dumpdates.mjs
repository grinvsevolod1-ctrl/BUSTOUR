import { createClient } from "@libsql/client"
import path from "node:path"
const url = "file:" + path.join(process.cwd(), "data", "app.db")
const c = createClient({ url })
const r = await c.execute("SELECT id, slug, title, datesTable FROM tours ORDER BY id")
let withData = 0
for (const row of r.rows) {
  let t
  try { t = JSON.parse(row.datesTable || "{}") } catch { t = {} }
  const rows = Array.isArray(t.rows) ? t.rows : []
  if (rows.length || (t.note && t.note.trim())) {
    withData++
    console.log(`#${row.id} ${row.slug} | note=${JSON.stringify(t.note||"")} cur=${t.currency||""} rows=${rows.length}`)
    for (const rr of rows) {
      console.log(`   dates=${JSON.stringify(rr.dates)} dur=${JSON.stringify(rr.duration)} tags=${(rr.tags||[]).length} rooms=${(rr.rooms||[]).map(x=>x.name+":"+x.price+"/"+x.discount).join(", ")}`)
    }
  }
}
console.log("TOTAL tours:", r.rows.length, "with dates data:", withData)
process.exit(0)
