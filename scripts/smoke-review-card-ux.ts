/**
 * UX smoke: /testimonials card heights + read-more desktop modal vs mobile expand.
 * Env: PLAYWRIGHT_BASE_URL (default DEV).
 * Run: npx tsx scripts/smoke-review-card-ux.ts
 */
import assert from "node:assert/strict"
import { chromium } from "@playwright/test"

const BASE = (process.env.PLAYWRIGHT_BASE_URL || process.env.MEDIA_SMOKE_BASE_URL || "http://31.77.228.133:3000").replace(
  /\/$/,
  "",
)

async function main() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()

  try {
    // Desktop: equal heights + modal
    await page.setViewportSize({ width: 1200, height: 900 })
    await page.goto(`${BASE}/testimonials`, { waitUntil: "domcontentloaded", timeout: 60_000 })
    await page.getByRole("button", { name: /Принять все|Отклонить/i }).click({ timeout: 5_000 }).catch(() => {})

    const articles = page.locator('article[itemtype="https://schema.org/Review"]')
    const count = await articles.count()
    assert.ok(count >= 1, "expected at least one review card")

    const heights = await articles.evaluateAll((els) => {
      // Compare first grid row only (same offsetTop).
      const list = els.map((el) => {
        const r = el.getBoundingClientRect()
        return { top: Math.round(r.top), height: r.height }
      })
      if (!list.length) return []
      const rowTop = list[0]!.top
      return list.filter((x) => Math.abs(x.top - rowTop) < 2).map((x) => x.height)
    })
    if (heights.length >= 2) {
      const max = Math.max(...heights)
      const min = Math.min(...heights)
      assert.ok(max - min < 2, `row cards equal height, delta=${max - min}`)
    }

    // Row-aware clamp: all text-only → 4; text next to media → may be > 4.
    const rowClamp = await articles.evaluateAll((els) => {
      const items = els.map((el) => {
        const top = Math.round(el.getBoundingClientRect().top)
        const hasMedia = el.getAttribute("data-has-media") === "1"
        const p = el.querySelector<HTMLElement>("[data-review-body]")
        const clamp = p ? getComputedStyle(p).webkitLineClamp : ""
        return { top, hasMedia, clamp: Number.parseInt(clamp, 10) || 0 }
      })
      const rows = new Map<number, typeof items>()
      for (const it of items) {
        let key = it.top
        for (const k of rows.keys()) {
          if (Math.abs(k - it.top) < 4) {
            key = k
            break
          }
        }
        const list = rows.get(key) || []
        list.push(it)
        rows.set(key, list)
      }
      return [...rows.values()].map((row) => {
        const rowHasMedia = row.some((r) => r.hasMedia)
        return row.map((r) => ({ ...r, rowHasMedia }))
      })
    })
    for (const row of rowClamp) {
      for (const card of row) {
        if (!card.rowHasMedia && !card.hasMedia) {
          assert.equal(card.clamp, 4, `text-only row clamp=4, got ${card.clamp}`)
        }
        if (card.rowHasMedia && !card.hasMedia) {
          assert.ok(card.clamp >= 4, `next to media clamp>=4, got ${card.clamp}`)
        }
      }
    }

    const readMore = page.getByRole("button", { name: "Читать полностью" }).first()
    if (await readMore.count()) {
      await readMore.click()
      await expectDialog(page)
      await page.keyboard.press("Escape")
    }

    // Mobile: inline expand, no dialog
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto(`${BASE}/testimonials`, { waitUntil: "domcontentloaded", timeout: 60_000 })
    await page.getByRole("button", { name: /Принять все|Отклонить/i }).click({ timeout: 5_000 }).catch(() => {})
    const mobileRead = page.getByRole("button", { name: "Читать полностью" }).first()
    if (await mobileRead.count()) {
      await mobileRead.click()
      await assert.ok(
        (await page.getByRole("button", { name: "Свернуть" }).count()) >= 1,
        "mobile expands inline",
      )
      assert.equal(await page.getByRole("dialog").count(), 0, "no modal on mobile")
    }

    // XSS: script tag must not execute; plain text ok if present in HTML as text
    const html = await page.content()
    assert.doesNotMatch(html, /<script>alert\(['"]xss['"]\)<\/script>/i)

    console.log(JSON.stringify({ ok: true, base: BASE, cards: count, heights }))
    console.log("ok")
  } finally {
    await browser.close()
  }
}

async function expectDialog(page: import("@playwright/test").Page) {
  const dialog = page.getByRole("dialog")
  assert.equal(await dialog.isVisible(), true, "desktop opens modal")
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
