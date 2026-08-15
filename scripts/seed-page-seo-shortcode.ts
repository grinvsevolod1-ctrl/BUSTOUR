/**
 * Seed {prefix}.seoTitle with [Y] + shortcode Y=year inside withSettingsSnapshot.
 * Always restores previous seoTitle / visible / section.seo values.
 * Env: SEO_PREFIX=hot|bustours|rental (default hot)
 * Run: npx tsx scripts/seed-page-seo-shortcode.ts
 *
 * For e2e/smoke prefer calling seedPageSeoWithRestore() so restore is guaranteed.
 */
import { ensureDb } from "../lib/db/init"
import { db } from "../lib/db"
import { shortcodes } from "../lib/db/schema"
import { withSettingsSnapshot } from "../lib/settings-snapshot"

const YEAR = String(new Date().getFullYear())
const PREFIX = (process.env.SEO_PREFIX || "hot").trim()
const TITLES: Record<string, string> = {
  hot: "Для кого подходят горящие туры [Y]",
  bustours: "Автобусные туры [Y]",
  rental: "Аренда автобусов [Y]",
}

export async function seedPageSeoWithRestore(
  prefix = PREFIX,
  fn?: () => Promise<void>,
): Promise<void> {
  const SEO_RAW = TITLES[prefix] ?? `${prefix} [Y]`
  const SEO_KEY = `${prefix}.seoTitle`
  const keys = [SEO_KEY, `${prefix}.visible`, `${prefix}.section.seo`]

  await ensureDb()
  await db
    .insert(shortcodes)
    .values({ name: "Y", value: YEAR, description: "Текущий год" })
    .onConflictDoUpdate({ target: shortcodes.name, set: { value: YEAR } })

  await withSettingsSnapshot(keys, async ({ set }) => {
    await set(SEO_KEY, SEO_RAW)
    await set(`${prefix}.visible`, "1")
    await set(`${prefix}.section.seo`, "1")
    console.log("seed-page-seo-shortcode: applied (will restore)", { prefix, YEAR, SEO_KEY, SEO_RAW })
    if (fn) await fn()
  })
  console.log("seed-page-seo-shortcode: restored", { prefix })
}

async function main() {
  await seedPageSeoWithRestore()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
