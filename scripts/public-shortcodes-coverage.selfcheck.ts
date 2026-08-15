/**
 * Public CMS shortcodes: settings + blocks expand on public path.
 * Run: npx tsx scripts/public-shortcodes-coverage.selfcheck.ts
 */
import assert from "node:assert/strict"
import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { ensureDb } from "../lib/db/init"
import { db } from "../lib/db"
import { shortcodes } from "../lib/db/schema"
import {
  expandSettingsValues,
  expandContentBlocks,
  expandPlainText,
  expandPublicDeep,
  expandPublicList,
} from "../lib/expand-content-blocks"
import { parseShortcodes } from "../lib/shortcodes"

async function main() {
  const YEAR = String(new Date().getFullYear())
  assert.equal(
    parseShortcodes("Для кого подходят горящие туры [Y]", { Y: YEAR }),
    `Для кого подходят горящие туры ${YEAR}`,
  )

  await ensureDb()
  await db
    .insert(shortcodes)
    .values({ name: "Y", value: YEAR, description: "Текущий год" })
    .onConflictDoUpdate({ target: shortcodes.name, set: { value: YEAR } })

  const expandedSettings = await expandSettingsValues({
    "hot.seoTitle": "Для кого подходят горящие туры [Y]",
    "hot.citiesTitle": "Курорты [Y]",
    "callus.title": "Вопросы [Y]?",
    "hot.alertText": "Акция [Y]",
    plain: "без скобок",
  } as Record<string, string>)
  assert.equal(expandedSettings["hot.seoTitle"], `Для кого подходят горящие туры ${YEAR}`)
  assert.equal(expandedSettings["hot.citiesTitle"], `Курорты ${YEAR}`)
  assert.equal(expandedSettings["callus.title"], `Вопросы ${YEAR}?`)
  assert.equal(expandedSettings["hot.alertText"], `Акция ${YEAR}`)
  assert.equal(expandedSettings["plain"], "без скобок")

  const blocks = await expandContentBlocks([
    {
      id: 1,
      collection: "faq",
      page: "hot",
      title: "Вопрос [Y]",
      subtitle: "Группа [Y]",
      body: "<p>Ответ [Y]</p>",
      icon: "",
      image: "",
      href: "",
      extra: { columns: ["A"], rows: [["ячейка [Y]"]] },
      sortOrder: 0,
      visible: true,
    },
  ])
  assert.equal(blocks[0]!.title, `Вопрос ${YEAR}`)
  assert.equal((blocks[0]!.extra as { rows: string[][] }).rows[0]![0], `ячейка ${YEAR}`)
  assert.equal(await expandPlainText("SEO [Y]"), `SEO ${YEAR}`)

  const tourLike = await expandPublicDeep({
    title: "Тур [Y]",
    description: "Описание [Y]",
    datesTable: {
      rows: [{ description: "Выезд [Y]", rooms: [] }],
    },
  })
  assert.equal(tourLike.title, `Тур ${YEAR}`)
  assert.equal(tourLike.description, `Описание ${YEAR}`)
  assert.equal(tourLike.datesTable.rows[0]!.description, `Выезд ${YEAR}`)

  const [busCard] = await expandPublicList([{ title: "Автобус [Y]", seats: "50" }])
  assert.equal(busCard!.title, `Автобус ${YEAR}`)
  assert.equal(busCard!.seats, "50")

  const [article] = await expandPublicList([
    { title: "Новость [Y]", metaShortDesc: "Анонс [Y]", excerpt: "excerpt" },
  ])
  assert.equal(article!.title, `Новость ${YEAR}`)
  assert.equal(article!.metaShortDesc, `Анонс ${YEAR}`)

  const cmsSrc = readFileSync(join(process.cwd(), "lib/cms.ts"), "utf8")
  assert.match(cmsSrc, /export async function getPublicSettings/)
  assert.match(cmsSrc, /expandSettingsValues/)

  const expandLib = readFileSync(join(process.cwd(), "lib/expand-content-blocks.ts"), "utf8")
  assert.match(expandLib, /expandSettingsValues/)
  assert.match(expandLib, /expandPublicDeep/)
  assert.match(expandLib, /expandPublicList/)

  const init = readFileSync(join(process.cwd(), "lib/db/init.ts"), "utf8")
  assert.match(init, /seedBuiltinShortcodes/)
  assert.match(init, /['\"]Y['\"]/)

  function walkTsx(dir: string, out: string[] = []): string[] {
    for (const name of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, name.name)
      if (name.isDirectory()) walkTsx(p, out)
      else if (name.name.endsWith(".tsx") || name.name.endsWith(".ts")) out.push(p)
    }
    return out
  }

  for (const file of walkTsx(join(process.cwd(), "app/(site)"))) {
    const src = readFileSync(file, "utf8")
    if (!src.includes("@/lib/cms")) continue
    if (/\bawait\s+getSettings\s*\(/.test(src)) {
      assert.fail(`${file} awaits raw getSettings() — use getPublicSettings()`)
    }
  }

  for (const rel of ["page-extras.tsx", "tour-page-content.tsx"]) {
    const src = readFileSync(join(process.cwd(), "components/site", rel), "utf8")
    assert.doesNotMatch(src, /await\s+getSettings\s*\(/)
    assert.match(src, /getPublicSettings/)
  }

  const tour = readFileSync(join(process.cwd(), "components/site/tour-page-content.tsx"), "utf8")
  assert.match(tour, /expandPlainText\(rawTour\.seoTitle\)/)
  assert.match(tour, /expandPublicDeep\(rawTour\)/)
  assert.match(tour, /expandPublicList\(rawRelated\)/)

  const publicTours = readFileSync(join(process.cwd(), "components/site/public-tours.tsx"), "utf8")
  assert.match(publicTours, /expandPublicList/)
  assert.match(publicTours, /PublicToursListing/)
  assert.match(publicTours, /PublicFeaturedTours/)

  const home = readFileSync(join(process.cwd(), "app/(site)/page.tsx"), "utf8")
  assert.match(home, /PublicFeaturedTours/)

  const busList = readFileSync(join(process.cwd(), "app/(site)/bus-rental/page.tsx"), "utf8")
  assert.match(busList, /expandPublicList/)

  const busDetail = readFileSync(join(process.cwd(), "app/(site)/bus-rental/[slug]/page.tsx"), "utf8")
  assert.match(busDetail, /expandPublicDeep/)

  const info = readFileSync(join(process.cwd(), "app/(site)/info/page.tsx"), "utf8")
  assert.match(info, /expandPublicList/)

  const testimonials = readFileSync(join(process.cwd(), "app/(site)/testimonials/page.tsx"), "utf8")
  assert.match(testimonials, /expandPublicList/)
  assert.match(testimonials, /path:\s*["']\/testimonials["']/)

  console.log("public-shortcodes-coverage.selfcheck: ok")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
