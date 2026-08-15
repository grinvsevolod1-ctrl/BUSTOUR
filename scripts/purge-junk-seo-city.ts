/**
 * #73: archive→purge junk city «Заполните SEO-текст» (+ optional orphan hot.title/subtitle).
 *
 * Dry-run: npx tsx "./scripts/purge-junk-seo-city.ts"
 * Apply:   npx tsx "./scripts/purge-junk-seo-city.ts" --apply
 */
import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { eq, like, or, sql } from "drizzle-orm"

function loadEnvLocal() {
  const p = path.join(process.cwd(), ".env.local")
  if (!existsSync(p)) return
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (!m) continue
    let val = m[2]!
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    process.env[m[1]!] ??= val
  }
}

const JUNK_SLUG = "zapolnite-seo-tekst"
const JUNK_NAME = "Заполните SEO-текст"

async function main() {
  loadEnvLocal()
  const apply = process.argv.includes("--apply")
  const { ensureDb } = await import("../lib/db/init")
  const { db } = await import("../lib/db")
  const { cityDestinations, tours, settings } = await import("../lib/db/schema")
  const { deleteCity, purgeCity } = await import("../lib/cities")

  await ensureDb()
  console.log(`mode=${apply ? "APPLY" : "dry-run"}`)

  const rows = await db
    .select()
    .from(cityDestinations)
    .where(or(eq(cityDestinations.slug, JUNK_SLUG), eq(cityDestinations.name, JUNK_NAME)))

  if (!rows.length) {
    console.log("junk city already gone")
  } else {
    for (const city of rows) {
      const [linked] = await db
        .select({ n: sql<number>`count(*)` })
        .from(tours)
        .where(eq(tours.arrivalCityId, city.id))
      const n = Number(linked?.n ?? 0)
      console.log(`city #${city.id} ${city.name} (${city.slug}) archived=${city.archived} tours=${n}`)
      if (n > 0) throw new Error(`refuse purge: ${n} tours still linked`)
      if (!apply) continue
      // Settings use live slug; clear before archive renames city slug
      const settingKeys = await db
        .select({ key: settings.key })
        .from(settings)
        .where(like(settings.key, `city:${city.category}:${JUNK_SLUG}%`))
      for (const row of settingKeys) {
        await db.delete(settings).where(eq(settings.key, row.key))
        console.log(`settings deleted: ${row.key}`)
      }
      if (!city.archived) await deleteCity(city.id)
      await purgeCity(city.id)
      console.log(`city purged: #${city.id}`)
    }
  }

  // Optional orphan keys from #65 (mentioned on #73)
  const hotOrphans = await db
    .select({ key: settings.key, value: settings.value })
    .from(settings)
    .where(or(eq(settings.key, "hot.title"), eq(settings.key, "hot.subtitle")))
  console.log(`hot orphan settings: ${hotOrphans.length}`)
  for (const row of hotOrphans) console.log(`  ${row.key}=${row.value.slice(0, 60)}`)
  if (apply) {
    for (const row of hotOrphans) {
      await db.delete(settings).where(eq(settings.key, row.key))
      console.log(`settings deleted: ${row.key}`)
    }
  }

  if (apply) {
    const gone = await db
      .select({ id: cityDestinations.id })
      .from(cityDestinations)
      .where(or(eq(cityDestinations.slug, JUNK_SLUG), eq(cityDestinations.name, JUNK_NAME)))
    if (gone.length) throw new Error("junk city still present after purge")
    console.log("verify: junk city gone")
  } else {
    console.log("dry-run complete — re-run with --apply to mutate Turso")
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
