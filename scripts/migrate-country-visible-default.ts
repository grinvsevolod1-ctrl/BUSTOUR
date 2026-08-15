/**
 * One-shot: publish countries stuck at visible=0 (#97 legacy create default).
 * Run: npx tsx scripts/migrate-country-visible-default.ts
 * Idempotent. Does not touch cities/tours.
 */
import { and, eq, like } from "drizzle-orm"
import { db } from "../lib/db"
import { settings } from "../lib/db/schema"
import { ensureDb } from "../lib/db/init"

async function main() {
  await ensureDb()
  const rows = await db
    .select({ key: settings.key, value: settings.value })
    .from(settings)
    .where(and(like(settings.key, "country:%"), eq(settings.value, "0")))

  const keys = rows.filter((r) => r.key.endsWith(".visible")).map((r) => r.key)
  for (const key of keys) {
    await db.update(settings).set({ value: "1" }).where(eq(settings.key, key))
  }
  console.log(`migrate-country-visible-default: published ${keys.length} countries`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
