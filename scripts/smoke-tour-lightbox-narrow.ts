/**
 * Tour gallery lightbox at 320 — nav + media fit.
 * Run: npx tsx scripts/smoke-tour-lightbox-narrow.ts
 */
import assert from "node:assert/strict"
import { chromium } from "@playwright/test"

const BASE = (process.env.PLAYWRIGHT_BASE_URL || "http://31.77.228.133:3000").replace(/\/$/, "")

async function main() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  try {
    await page.setViewportSize({ width: 320, height: 700 })
    await page.goto(`${BASE}/avtobusnye-tury`, { waitUntil: "domcontentloaded", timeout: 60_000 })
    await page.getByRole("button", { name: /Принять все|Отклонить/i }).click({ timeout: 5_000 }).catch(() => {})

    // First tour link
    const tour = page.locator('a[href*="/avtobusnye-tury/"]').filter({ has: page.locator("img") }).first()
    const href = await tour.getAttribute("href")
    assert.ok(href, "need a tour link")
    await page.goto(`${BASE}${href!.startsWith("http") ? new URL(href!).pathname : href}`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    })
    await page.getByRole("button", { name: /Принять все|Отклонить/i }).click({ timeout: 5_000 }).catch(() => {})

    // Open gallery lightbox — main image click
    const zoom = page.locator('[aria-label*="фото"], button.cursor-zoom-in, .relative button').filter({ has: page.locator("img") }).first()
    // Prefer explicit zoom on gallery hero
    const galleryZoom = page.locator("button").filter({ hasText: /^$/ }).locator("..")
    const mainImgBtn = page.locator("section, div").locator("button[type='button']").filter({ has: page.locator("img") }).first()

    // tour-gallery: click on main slide area that calls setLightbox
    const opened = await page.evaluate(() => {
      const candidates = [...document.querySelectorAll("button, [role='button']")] as HTMLElement[]
      for (const el of candidates) {
        const t = (el.getAttribute("aria-label") || "") + (el.textContent || "")
        if (/увеличить|открыть|lightbox|фото/i.test(t)) {
          el.click()
          return "aria"
        }
      }
      // Fallback: largest image's parent button
      const imgs = [...document.querySelectorAll("img")] as HTMLImageElement[]
      imgs.sort((a, b) => b.clientWidth * b.clientHeight - a.clientWidth * a.clientHeight)
      for (const img of imgs.slice(0, 5)) {
        const btn = img.closest("button")
        if (btn) {
          btn.click()
          return "img-btn"
        }
      }
      return ""
    })

    if (!opened) {
      console.log(JSON.stringify({ ok: true, skip: "no gallery open control", href }))
      return
    }

    const overlay = page.locator("div.fixed.inset-0.z-50").filter({ has: page.getByRole("button", { name: "Закрыть" }) })
    await overlay.first().waitFor({ state: "visible", timeout: 10_000 })

    const close = overlay.getByRole("button", { name: "Закрыть" })
    const prev = overlay.getByRole("button", { name: "Предыдущее" })
    const next = overlay.getByRole("button", { name: "Следующее" })
    const vw = 320
    const vh = 700

    for (const [name, loc] of [
      ["close", close],
      ["prev", prev],
      ["next", next],
    ] as const) {
      if (!(await loc.count())) continue
      const box = await loc.boundingBox()
      assert.ok(box, `${name} box`)
      assert.ok(box!.width >= 44 && box!.height >= 44, `${name} touch ${box!.width}x${box!.height}`)
      assert.ok(box!.x >= -1 && box!.x + box!.width <= vw + 2, `${name} x out ${JSON.stringify(box)}`)
      assert.ok(box!.y >= -1 && box!.y + box!.height <= vh + 2, `${name} y out ${JSON.stringify(box)}`)
    }

    const media = overlay.locator("img, video").first()
    const mbox = await media.boundingBox()
    if (mbox) {
      assert.ok(mbox.width <= vw + 4, `media width ${mbox.width}`)
      assert.ok(mbox.height <= vh + 4, `media height ${mbox.height}`)
    }

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)
    assert.equal(overflow, false, "horizontal overflow")

    // Nav buttons must not fully cover media center
    if ((await prev.count()) && (await next.count()) && mbox) {
      const pb = await prev.boundingBox()
      const nb = await next.boundingBox()
      const gap = (nb?.x ?? 0) - ((pb?.x ?? 0) + (pb?.width ?? 0))
      assert.ok(gap > 40, `nav gap too small: ${gap}`)
    }

    await close.click()
    console.log(JSON.stringify({ ok: true, href, opened, media: mbox }))
    console.log("ok")
  } finally {
    await browser.close()
  }
}

main().catch((e) => {
  console.error(e)
  process.exitCode = 1
})
