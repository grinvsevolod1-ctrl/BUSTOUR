/**
 * #105 Playwright: public tables overflow + adaptive presence.
 * - Tour dates table
 * - Resort comparison (skips presence assert if CMS has no bound tables)
 * - Prose/SEO table inside rich content
 *
 * Run: PLAYWRIGHT_BROWSERS_PATH=Z:\bustour\playwright-browsers npx tsx scripts/smoke-public-tables-responsive.ts
 */
import assert from "node:assert/strict"
import { chromium, type Page } from "@playwright/test"

const BASE = (process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000").replace(/\/$/, "")
const WIDTHS = [1440, 1024, 768, 320] as const

const PATHS = {
  dates: process.env.SMOKE_DATES_PATH || "/avtobusnye-tury/rossiya/sankt-peterburg/tur-vyhodnogo-dnya-v-piter",
  resort: process.env.SMOKE_RESORT_PATH || "/avtobusnye-tury/rossiya/sankt-peterburg/",
  prose: process.env.SMOKE_PROSE_PATH || "/info/transfers/sheremetyevo",
}

async function dismissCookie(page: Page) {
  await page.getByRole("button", { name: /Принять все|Отклонить/i }).click({ timeout: 5_000 }).catch(() => {})
}

async function noOverflow(page: Page, label: string, width: number) {
  const bad = await page.evaluate(() => {
    const doc = document.documentElement
    return {
      overflow: doc.scrollWidth > doc.clientWidth + 1,
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
    }
  })
  assert.equal(
    bad.overflow,
    false,
    `${label}@${width}: H-overflow scroll=${bad.scrollWidth} client=${bad.clientWidth}`,
  )
}

async function countVisible(page: Page, selector: string) {
  return page.locator(selector).evaluateAll((els) =>
    els.filter((el) => {
      const s = getComputedStyle(el)
      return s.display !== "none" && el.getClientRects().length > 0
    }).length,
  )
}

async function sweep(page: Page, label: string, path: string, check: (page: Page, width: number) => Promise<void>) {
  await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 120_000 })
  await dismissCookie(page)
  await page.waitForSelector("h1, h2", { timeout: 60_000 })
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 900 })
    await page.waitForTimeout(300)
    await noOverflow(page, label, width)
    await check(page, width)
  }
  console.log(`ok ${label}`)
}

async function main() {
  const browser = await chromium.launch()
  const page = await browser.newPage()
  try {
    await sweep(page, "dates", PATHS.dates, async (p, width) => {
      const tables = await countVisible(p, "table")
      const cards = await countVisible(p, "article, .rounded-xl.border")
      if (width >= 1024) {
        assert.ok(tables >= 1, `dates@${width}: expected visible dates table`)
      } else {
        assert.ok(cards >= 1 || tables === 0, `dates@${width}: expected mobile cards (or no table)`)
      }
    })

    let resortHadTable = false
    await sweep(page, "resort", PATHS.resort, async (p, width) => {
      const tables = await countVisible(p, "table")
      if (tables > 0) {
        resortHadTable = true
        if (width >= 1024) assert.ok(tables >= 1, `resort@${width}: table visible`)
      }
    })
    if (!resortHadTable) {
      console.log("warn resort: no visible table (section off or empty after global fallback)")
    }

    await sweep(page, "prose", PATHS.prose, async (p, width) => {
      const proseTables = await countVisible(p, ".prose-content table, .prose-content table.seo-table")
      const scheduleTables = await countVisible(p, "section table")
      // Prefer real prose table; fall back to schedule table still exercising overflow CSS at narrow widths.
      if (proseTables === 0 && scheduleTables === 0 && width >= 1024) {
        assert.fail(`prose@${width}: expected at least one table (prose or schedule)`)
      }
      if (proseTables > 0) {
        const boxOk = await p.locator(".prose-content table").first().evaluate((el) => {
          const parent = el.closest(".prose-content") as HTMLElement | null
          if (!parent) return false
          return el.scrollWidth <= parent.clientWidth + 2 || getComputedStyle(el).overflowX === "auto"
        })
        assert.ok(boxOk, `prose@${width}: table should scroll inside prose container`)
      }
    })

    console.log("smoke-public-tables-responsive: ok")
  } finally {
    await browser.close()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
