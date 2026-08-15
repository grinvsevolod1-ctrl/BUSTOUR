/**
 * #104 smoke: transfer schedule at 1440/1024/768/320 — no H-overflow; cards below lg.
 * Run: PLAYWRIGHT_BROWSERS_PATH=Z:\bustour\playwright-browsers npx tsx scripts/smoke-transfer-schedule-responsive.ts
 */
import assert from "node:assert/strict"
import { chromium, type Page } from "@playwright/test"

const BASE = (process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000").replace(/\/$/, "")
const PATH = process.env.TRANSFER_SMOKE_PATH || "/info/transfers/sheremetyevo"
const WIDTHS = [1440, 1024, 768, 320] as const

async function dismissCookie(page: Page) {
  await page.getByRole("button", { name: /Принять все|Отклонить/i }).click({ timeout: 5_000 }).catch(() => {})
}

async function measure(page: Page, width: number) {
  return page.evaluate((w) => {
    const doc = document.documentElement
    const tables = Array.from(document.querySelectorAll("table"))
    const visibleTables = tables.filter((el) => {
      const s = getComputedStyle(el)
      return s.display !== "none" && el.getClientRects().length > 0
    }).length
    const cards = Array.from(document.querySelectorAll("article.rounded-xl"))
    const cardHasPrice = cards.some((a) => /В одну сторону|В обе стороны/.test(a.textContent || ""))
    return {
      w,
      overflow: doc.scrollWidth > doc.clientWidth + 1,
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
      visibleTables,
      cardCount: cards.length,
      cardHasPrice,
    }
  }, width)
}

async function main() {
  const browser = await chromium.launch()
  const page = await browser.newPage()
  try {
    await page.goto(`${BASE}${PATH}`, { waitUntil: "domcontentloaded", timeout: 120_000 })
    await dismissCookie(page)
    await page.waitForSelector("h1, h2", { timeout: 60_000 })

    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 900 })
      await page.waitForTimeout(350)
      const m = await measure(page, width)
      assert.equal(m.overflow, false, `${width}px: H-overflow scroll=${m.scrollWidth} client=${m.clientWidth}`)
      if (width >= 1024) {
        assert.ok(m.visibleTables >= 1, `${width}px: expected visible schedule table`)
      } else {
        assert.ok(m.cardCount >= 1, `${width}px: expected mobile schedule cards`)
        assert.equal(m.cardHasPrice, false, `${width}px: cards must not repeat prices`)
      }
      console.log(`ok ${width}`, m)
    }
    console.log("smoke-transfer-schedule-responsive: ok")
  } finally {
    await browser.close()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
