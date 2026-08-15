/**
 * #61/#62: /testimonials expands [Y] in review texts; reviews.* SEO seed + canonical.
 * Run: npx tsx scripts/reviews-page-seo-shortcodes.selfcheck.ts
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { ensureDb } from "../lib/db/init"
import { db } from "../lib/db"
import { shortcodes } from "../lib/db/schema"
import { defaultSettings } from "../lib/db/cms-seed"
import { expandPublicList } from "../lib/expand-content-blocks"
import { absoluteUrl, metadataFromSettings } from "../lib/seo-metadata"

async function main() {
  const YEAR = String(new Date().getFullYear())
  await ensureDb()
  await db
    .insert(shortcodes)
    .values({ name: "Y", value: YEAR, description: "Текущий год" })
    .onConflictDoUpdate({ target: shortcodes.name, set: { value: YEAR } })

  const [review] = await expandPublicList([
    {
      id: 1,
      type: "TEXT" as const,
      name: "Анна [Y]",
      tour: "Карелия [Y]",
      text: "Ездили в [Y] году, всё супер",
      rating: 5,
      source: "manual" as const,
      sourceId: null,
      sourceDate: "",
      approved: true,
      showOn: ["testimonials"],
      videoUrl: "",
      thumbnailUrl: "",
      archived: false,
    },
  ])
  assert.equal(review!.name, `Анна ${YEAR}`)
  assert.equal(review!.tour, `Карелия ${YEAR}`)
  assert.equal(review!.text, `Ездили в ${YEAR} году, всё супер`)

  assert.equal(defaultSettings["reviews.metaTitle"], "Отзывы — БасТур")
  assert.ok((defaultSettings["reviews.metaShortDesc"] ?? "").length >= 12)
  assert.ok((defaultSettings["reviews.metaDescription"] ?? "").length >= 12)

  const meta = await metadataFromSettings(
    {
      "reviews.metaTitle": "Отзывы [Y] — БасТур",
      "reviews.metaDescription": "Длинное описание отзывов",
      "reviews.metaShortDesc": "Превью отзывов [Y]",
    },
    "reviews",
    "Fallback",
    "Fallback desc",
    { path: "/testimonials" },
  )
  assert.equal(meta.title, `Отзывы ${YEAR} — БасТур`)
  assert.equal(meta.description, `Превью отзывов ${YEAR}`)
  assert.deepEqual(meta.alternates, { canonical: absoluteUrl("/testimonials") })
  assert.equal((meta.openGraph as { description?: string }).description, `Превью отзывов ${YEAR}`)
  assert.equal((meta.openGraph as { url?: string }).url, absoluteUrl("/testimonials"))

  const page = readFileSync(join(process.cwd(), "app/(site)/testimonials/page.tsx"), "utf8")
  assert.match(page, /expandPublicList/)
  assert.match(page, /path:\s*["']\/testimonials["']/)
  assert.match(page, /metadataFromSettings\([\s\S]*["']reviews["']/)

  const home = readFileSync(join(process.cwd(), "app/(site)/page.tsx"), "utf8")
  assert.match(home, /expandPublicList\(rawReviews\)/)

  const tour = readFileSync(join(process.cwd(), "components/site/tour-page-content.tsx"), "utf8")
  assert.match(tour, /expandPublicList\(reviews\)/)

  console.log("reviews-page-seo-shortcodes.selfcheck: ok")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
