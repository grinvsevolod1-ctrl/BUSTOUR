/**
 * One-shot: move orphaned CMS settings/blocks (old slug keys) onto live entities.
 *
 * Dry-run (default):
 *   npx tsx scripts/orphan-cms-cleanup.ts
 *
 * Apply remaps only:
 *   npx tsx scripts/orphan-cms-cleanup.ts --apply
 *
 * Also delete duplicate orphans (content already on live) and dead orphans (no entity):
 *   npx tsx scripts/orphan-cms-cleanup.ts --apply --purge-duplicates --purge-unmatched
 */
import { ensureDb } from "../lib/db/init"
import { db, client } from "../lib/db"
import { countries, cityDestinations, tours, buses, transfers } from "../lib/db/schema"
import { stripArchivedSuffix } from "../lib/archive-slug"
import { deletePageScopedContent, rekeyPageScopedContent } from "../lib/page-rekey"
import {
  pageKeyFromSettingKey,
  planOrphanCmsRemaps,
  type CmsLiveEntity,
  type CmsPageBag,
} from "../lib/orphan-cms-cleanup"

const apply = process.argv.includes("--apply")
const purgeDuplicates = process.argv.includes("--purge-duplicates")
const purgeUnmatched = process.argv.includes("--purge-unmatched")

async function main() {
  await ensureDb()

  const [countryRows, cityRows, tourRows, busRows, transferRows, settingRows, blockRows] =
    await Promise.all([
      db.select({ slug: countries.slug, name: countries.name, category: countries.category }).from(countries),
      db
        .select({
          slug: cityDestinations.slug,
          name: cityDestinations.name,
          category: cityDestinations.category,
        })
        .from(cityDestinations),
      db.select({ slug: tours.slug, title: tours.title, id: tours.id }).from(tours),
      db.select({ slug: buses.slug, title: buses.title }).from(buses),
      db.select({ slug: transfers.slug, title: transfers.title }).from(transfers),
      client.execute({ sql: "SELECT key FROM settings", args: [] }),
      client.execute({ sql: "SELECT page, COUNT(*) AS n FROM content_blocks GROUP BY page", args: [] }),
    ])

  const live: CmsLiveEntity[] = []
  for (const c of countryRows) {
    const slug = stripArchivedSuffix(c.slug)
    live.push({
      pageKey: `country:${c.category}:${slug}`,
      name: c.name,
      slug,
      category: c.category,
      kind: "country",
    })
  }
  for (const c of cityRows) {
    const slug = stripArchivedSuffix(c.slug)
    live.push({
      pageKey: `city:${c.category}:${slug}`,
      name: c.name,
      slug,
      category: c.category,
      kind: "city",
    })
  }
  for (const t of tourRows) {
    const slug = stripArchivedSuffix(t.slug)
    live.push({ pageKey: `tour:${slug}`, name: t.title, slug, kind: "tour" })
    live.push({
      pageKey: `tour:${t.id}`,
      name: t.title,
      slug: String(t.id),
      kind: "tour",
    })
  }
  for (const b of busRows) {
    const slug = stripArchivedSuffix(b.slug)
    live.push({ pageKey: `bus:${slug}`, name: b.title, slug, kind: "bus" })
  }
  for (const t of transferRows) {
    const slug = stripArchivedSuffix(t.slug)
    live.push({ pageKey: `transfer:${slug}`, name: t.title, slug, kind: "transfer" })
  }

  const bags = new Map<string, CmsPageBag>()
  const ensureBag = (pageKey: string) => {
    let bag = bags.get(pageKey)
    if (!bag) {
      bag = { pageKey, settingKeys: [], blockCount: 0 }
      bags.set(pageKey, bag)
    }
    return bag
  }

  for (const row of settingRows.rows) {
    const key = String(row.key ?? row[0] ?? "")
    const pageKey = pageKeyFromSettingKey(key)
    if (!pageKey) continue
    ensureBag(pageKey).settingKeys.push(key)
  }
  for (const row of blockRows.rows) {
    const page = String(row.page ?? row[0] ?? "")
    const n = Number(row.n ?? row[1] ?? 0)
    if (!page) continue
    ensureBag(page).blockCount += n
  }

  const plan = planOrphanCmsRemaps(live, bags)

  console.log(`Orphan CMS cleanup (${apply ? "APPLY" : "dry-run"})`)
  console.log(`Remaps: ${plan.remaps.length}`)
  for (const r of plan.remaps) {
    console.log(`  ${r.from}  →  ${r.to}  (score=${r.score}, ${r.reason})`)
  }
  console.log(`Duplicate orphans (purge with --purge-duplicates): ${plan.purgeDuplicates.length}`)
  for (const d of plan.purgeDuplicates) {
    console.log(`  DROP ${d.orphan}  (dup of ${d.live}, score=${d.score})`)
  }
  if (plan.unmatchedOrphans.length) {
    console.log(`Dead orphans (purge with --purge-unmatched): ${plan.unmatchedOrphans.length}`)
    for (const k of plan.unmatchedOrphans) console.log(`  DROP ${k}`)
  }
  if (plan.unmatchedEmpties.length) {
    console.log(`Empty live without orphan (${plan.unmatchedEmpties.length}):`)
    for (const k of plan.unmatchedEmpties.slice(0, 20)) console.log(`  ${k}`)
    if (plan.unmatchedEmpties.length > 20) console.log(`  … +${plan.unmatchedEmpties.length - 20} more`)
  }

  if (!apply) {
    console.log("\nRe-run with --apply [--purge-duplicates] [--purge-unmatched]")
    return
  }

  for (const r of plan.remaps) {
    await rekeyPageScopedContent(r.from, r.to)
    console.log(`Applied ${r.from} → ${r.to}`)
  }
  if (purgeDuplicates) {
    for (const d of plan.purgeDuplicates) {
      await deletePageScopedContent(d.orphan)
      console.log(`Purged duplicate ${d.orphan}`)
    }
  }
  if (purgeUnmatched) {
    for (const k of plan.unmatchedOrphans) {
      await deletePageScopedContent(k)
      console.log(`Purged dead ${k}`)
    }
  }
  console.log("Done.")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
