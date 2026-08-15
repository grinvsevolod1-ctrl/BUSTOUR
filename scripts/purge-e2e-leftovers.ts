/**
 * One-shot / ops: archive+purge E2E leftovers on live Turso (via .env.local).
 * Also clears E2E-ALERT settings and notes polluted SEO titles.
 * Run: npx tsx scripts/purge-e2e-leftovers.ts
 *
 * Sticky «Тестовый город QA» with linked seed tours: use
 * `scripts/reassign-sticky-qa-city.ts --apply` first (#70), then this script.
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
    const key = m[1]!
    let val = m[2]!
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    process.env[key] ??= val
  }
}

const report: string[] = []

function log(msg: string) {
  report.push(msg)
  console.log(msg)
}

async function main() {
  loadEnvLocal()
  const { ensureDb } = await import("../lib/db/init")
  const { db } = await import("../lib/db")
  const {
    tours,
    buses,
    articles,
    reviews,
    countries,
    settings,
    admins,
  } = await import("../lib/db/schema")
  const { cityDestinations } = await import("../lib/db/schema")
  const {
    deleteTour,
    purgeTour,
    deleteBus,
    purgeBus,
    deleteArticle,
    purgeArticle,
    deleteReview,
    purgeReview,
  } = await import("../lib/queries")
  const { deleteCountry, purgeCountry } = await import("../lib/countries")
  const { deleteCity, purgeCity } = await import("../lib/cities")
  const { softDeleteAdminUser, purgeAdminUser } = await import("../lib/admins")

  await ensureDb()
  log(`purge-e2e-leftovers: db=${(process.env.DATABASE_URL || "file:local").slice(0, 48)}…`)

  // --- tours ---
  const e2eTours = await db
    .select({ id: tours.id, title: tours.title, slug: tours.slug, archived: tours.archived })
    .from(tours)
    .where(
      or(
        like(tours.title, "E2E%"),
        like(tours.slug, "e2e-%"),
        like(tours.title, "E2E %"),
      ),
    )
  for (const t of e2eTours) {
    try {
      if (!t.archived) await deleteTour(t.id)
      await purgeTour(t.id)
      log(`tour purged: ${t.id} ${t.title}`)
    } catch (e) {
      log(`tour SKIP ${t.id} ${t.title}: ${(e as Error).message}`)
    }
  }

  // --- buses ---
  const e2eBuses = await db
    .select({ id: buses.id, title: buses.title, slug: buses.slug, archived: buses.archived })
    .from(buses)
    .where(or(like(buses.title, "E2E%"), like(buses.slug, "e2e-%")))
  for (const b of e2eBuses) {
    try {
      if (!b.archived) await deleteBus(b.id)
      await purgeBus(b.id)
      log(`bus purged: ${b.id} ${b.title}`)
    } catch (e) {
      log(`bus SKIP ${b.id}: ${(e as Error).message}`)
    }
  }

  // --- articles ---
  const e2eArticles = await db
    .select({
      id: articles.id,
      title: articles.title,
      slug: articles.slug,
      archived: articles.archived,
    })
    .from(articles)
    .where(or(like(articles.title, "E2E%"), like(articles.slug, "e2e-%")))
  for (const a of e2eArticles) {
    try {
      if (!a.archived) await deleteArticle(a.id)
      await purgeArticle(a.id)
      log(`article purged: ${a.id} ${a.title}`)
    } catch (e) {
      log(`article SKIP ${a.id}: ${(e as Error).message}`)
    }
  }

  // --- reviews ---
  const e2eReviews = await db
    .select({ id: reviews.id, name: reviews.name, archived: reviews.archived })
    .from(reviews)
    .where(or(like(reviews.name, "E2E%"), like(reviews.name, "E2E %")))
  for (const r of e2eReviews) {
    try {
      if (!r.archived) await deleteReview(r.id)
      await purgeReview(r.id)
      log(`review purged: ${r.id} ${r.name}`)
    } catch (e) {
      log(`review SKIP ${r.id}: ${(e as Error).message}`)
    }
  }

  // --- cities (incl. sticky QA) ---
  const e2eCities = await db
    .select({
      id: cityDestinations.id,
      name: cityDestinations.name,
      slug: cityDestinations.slug,
      archived: cityDestinations.archived,
    })
    .from(cityDestinations)
    .where(
      or(
        like(cityDestinations.name, "E2E%"),
        like(cityDestinations.slug, "e2e-%"),
        eq(cityDestinations.slug, "testovyy-gorod-qa"),
        eq(cityDestinations.name, "Тестовый город QA"),
      ),
    )
  for (const c of e2eCities) {
    const [linked] = await db
      .select({ n: sql<number>`count(*)` })
      .from(tours)
      .where(eq(tours.arrivalCityId, c.id))
    const n = Number(linked?.n ?? 0)
    if (n > 0) {
      log(`city REPORT-ONLY ${c.id} ${c.name} (${c.slug}): ${n} tours still linked — not purged`)
      continue
    }
    try {
      if (!c.archived) await deleteCity(c.id)
      await purgeCity(c.id)
      log(`city purged: ${c.id} ${c.name}`)
    } catch (e) {
      log(`city SKIP ${c.id}: ${(e as Error).message}`)
    }
  }

  // --- countries ---
  const e2eCountries = await db
    .select({
      id: countries.id,
      name: countries.name,
      slug: countries.slug,
      archived: countries.archived,
    })
    .from(countries)
    .where(or(like(countries.name, "E2E%"), like(countries.slug, "e2e-%")))
  for (const c of e2eCountries) {
    const [linked] = await db
      .select({ n: sql<number>`count(*)` })
      .from(tours)
      .where(eq(tours.countryId, c.id))
    const n = Number(linked?.n ?? 0)
    if (n > 0) {
      log(`country REPORT-ONLY ${c.id} ${c.name}: ${n} tours linked`)
      continue
    }
    try {
      if (!c.archived) await deleteCountry(c.id)
      await purgeCountry(c.id)
      log(`country purged: ${c.id} ${c.name}`)
    } catch (e) {
      log(`country SKIP ${c.id}: ${(e as Error).message}`)
    }
  }

  // --- settings: clear E2E-ALERT; note SEO seed templates ---
  const SEO_TEMPLATES = [
    "Для кого подходят горящие туры [Y]",
    "Автобусные туры [Y]",
    "Аренда автобусов [Y]",
  ]
  const alertRows = await db
    .select()
    .from(settings)
    .where(like(settings.key, "%.alertText"))
  for (const row of alertRows) {
    if (/E2E-ALERT/i.test(row.value)) {
      await db.update(settings).set({ value: "" }).where(eq(settings.key, row.key))
      log(`settings cleared alert: ${row.key}`)
    }
  }
  const seoRows = await db
    .select()
    .from(settings)
    .where(like(settings.key, "%.seoTitle"))
  for (const row of seoRows) {
    if (SEO_TEMPLATES.includes(row.value) || /E2E/i.test(row.value)) {
      log(`settings SEO NOTE (left as-is; restore manually if needed): ${row.key}=${row.value}`)
    }
  }

  // --- qa_* / del_* admin users ---
  const qaAdmins = await db
    .select({ id: admins.id, username: admins.username, active: admins.active })
    .from(admins)
    .where(or(like(admins.username, "qa_%"), like(admins.username, "del_%")))
  for (const a of qaAdmins) {
    try {
      if (a.active) await softDeleteAdminUser(a.id)
      await purgeAdminUser(a.id)
      log(`admin purged: ${a.id} ${a.username}`)
    } catch (e) {
      log(`admin SKIP ${a.id} ${a.username}: ${(e as Error).message}`)
    }
  }

  log(`purge-e2e-leftovers: done (${report.length} lines)`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
