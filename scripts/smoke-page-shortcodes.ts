/**
 * HTTP smoke: catalog/rental SEO titles expand [Y].
 * Seeds under withSettingsSnapshot (restore always).
 * Run: npx tsx scripts/smoke-page-shortcodes.ts
 * Requires: npm run dev on :3000
 */
import assert from "node:assert/strict"
import { seedPageSeoWithRestore } from "./seed-page-seo-shortcode"

const YEAR = String(new Date().getFullYear())
const base = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000"

const CASES = [
  {
    prefix: "hot",
    path: "/hot/",
    raw: "Для кого подходят горящие туры [Y]",
    expanded: `Для кого подходят горящие туры ${YEAR}`,
  },
  {
    prefix: "bustours",
    path: "/avtobusnye-tury/",
    raw: "Автобусные туры [Y]",
    expanded: `Автобусные туры ${YEAR}`,
  },
  {
    prefix: "rental",
    path: "/bus-rental/",
    raw: "Аренда автобусов [Y]",
    expanded: `Аренда автобусов ${YEAR}`,
  },
] as const

async function main() {
  for (const c of CASES) {
    await seedPageSeoWithRestore(c.prefix, async () => {
      const res = await fetch(`${base}${c.path}`, { redirect: "follow" })
      assert.equal(res.status, 200, `${c.path}: expected 200 got ${res.status}`)
      const html = await res.text()
      assert.ok(!html.includes("Что-то пошло не так"), `${c.path}: error boundary`)
      assert.ok(html.includes(c.expanded), `${c.path}: missing expanded: ${c.expanded}`)
      assert.ok(!html.includes(c.raw), `${c.path}: raw [Y] still present`)
    })
  }
  console.log("smoke-page-shortcodes: ok")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
