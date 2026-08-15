/**
 * #23: FAQ Q/A + resort comparison cells expand shortcodes on public render paths.
 * Run: npx tsx scripts/shortcode-faq-tables.selfcheck.ts
 */
import assert from "node:assert/strict"
import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { ensureDb } from "../lib/db/init"
import { db } from "../lib/db"
import { shortcodes } from "../lib/db/schema"
import { expandContentBlocks } from "../lib/expand-content-blocks"

const root = process.cwd()
const YEAR = String(new Date().getFullYear())

function read(rel: string) {
  return readFileSync(join(root, rel), "utf8")
}

function walkTsx(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, name.name)
    if (name.isDirectory()) walkTsx(p, out)
    else if (name.name.endsWith(".tsx") || name.name.endsWith(".ts")) out.push(p)
  }
  return out
}

async function main() {
  await ensureDb()
  await db
    .insert(shortcodes)
    .values({ name: "Y", value: YEAR, description: "Текущий год" })
    .onConflictDoUpdate({ target: shortcodes.name, set: { value: YEAR } })

  const [faq] = await expandContentBlocks([
    {
      id: 1,
      collection: "faq",
      page: "hot",
      title: "Туры [Y]?",
      subtitle: "Группа [Y]",
      body: "<p>Ответ про [Y]</p>",
      icon: "",
      image: "",
      href: "",
      extra: {},
      sortOrder: 0,
      visible: true,
    },
  ])
  assert.equal(faq!.title, `Туры ${YEAR}?`)
  assert.equal(faq!.subtitle, `Группа ${YEAR}`)
  assert.equal(faq!.body, `<p>Ответ про ${YEAR}</p>`)

  const [table] = await expandContentBlocks([
    {
      id: 2,
      collection: "resort",
      page: "hot",
      title: "Таблица [Y]",
      subtitle: "",
      body: "",
      icon: "",
      image: "",
      href: "",
      extra: {
        columns: ["Курорт", "Год [Y]"],
        rows: [["Анталья", "сезон [Y]"], ["<p>Римини [Y]</p>", "ok"]],
      },
      sortOrder: 0,
      visible: true,
    },
  ])
  const extra = table!.extra as { columns: string[]; rows: string[][] }
  assert.equal(table!.title, `Таблица ${YEAR}`)
  assert.equal(extra.columns[1], `Год ${YEAR}`)
  assert.equal(extra.rows[0]![1], `сезон ${YEAR}`)
  assert.equal(extra.rows[1]![0], `<p>Римини ${YEAR}</p>`)

  // Render paths must call expand before Faq / client table.
  for (const rel of [
    "components/site/ordered-faq-section.tsx",
    "components/site/page-extras.tsx",
    "components/site/resort-comparison-blocks.tsx",
  ]) {
    const src = read(rel)
    assert.match(src, /expandContentBlocks/, `${rel} must expand shortcodes`)
  }

  const faqUi = read("components/site/faq.tsx")
  assert.match(faqUi, /question:\s*b\.title/)
  assert.match(faqUi, /answer:\s*b\.body/)

  const wrapper = read("components/site/resort-comparison-blocks.tsx")
  assert.match(wrapper, /await expandContentBlocks\(blocks\)/)
  assert.match(
    wrapper,
    /from ["']@\/components\/site\/resort-comparison-table["']/,
  )

  // Public pages must use server wrapper, not raw client table (would skip expand).
  for (const file of walkTsx(join(root, "app/(site)"))) {
    const src = readFileSync(file, "utf8")
    if (src.includes("resort-comparison-table")) {
      assert.fail(`${file} imports client resort table — use resort-comparison-blocks`)
    }
  }

  console.log("shortcode-faq-tables.selfcheck: ok")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
