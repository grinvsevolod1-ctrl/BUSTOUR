/**
 * Narrow viewport lightbox smoke (320/375): licenses + review photos.
 * Run: npx tsx scripts/smoke-lightbox-narrow.ts
 */
import assert from "node:assert/strict"
import { chromium, type Page } from "@playwright/test"

const BASE = (process.env.PLAYWRIGHT_BASE_URL || "http://31.77.228.133:3000").replace(/\/$/, "")

async function dismissCookie(page: Page) {
  await page.getByRole("button", { name: /Принять все|Отклонить/i }).click({ timeout: 5_000 }).catch(() => {})
}

async function assertNoHOverflow(page: Page) {
  const bad = await page.evaluate(() => {
    const doc = document.documentElement
    return {
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
      overflow: doc.scrollWidth > doc.clientWidth + 1,
    }
  })
  assert.equal(bad.overflow, false, `horizontal overflow scroll=${bad.scrollWidth} client=${bad.clientWidth}`)
}

async function assertLightboxOk(page: Page, label: string) {
  const overlay = page.locator("div.fixed.inset-0.z-50").filter({ has: page.getByRole("button", { name: "Закрыть" }) })
  await assert.ok(await overlay.count(), `${label}: overlay missing`)
  await overlay.first().waitFor({ state: "visible" })

  const cover = await overlay.first().evaluate((el) => {
    const r = el.getBoundingClientRect()
    return {
      w: r.width,
      h: r.height,
      vw: window.innerWidth,
      vh: window.innerHeight,
      parent: el.parentElement?.tagName ?? "",
    }
  })
  assert.equal(cover.parent, "BODY", `${label}: must portal to body, parent=${cover.parent}`)
  assert.ok(cover.w >= cover.vw - 2, `${label}: overlay not full width ${cover.w}/${cover.vw}`)
  assert.ok(cover.h >= cover.vh - 2, `${label}: overlay not full height ${cover.h}/${cover.vh}`)

  const close = overlay.getByRole("button", { name: "Закрыть" })
  const box = await close.boundingBox()
  assert.ok(box, `${label}: close button box`)
  assert.ok(box!.width >= 44 && box!.height >= 44, `${label}: close touch target ${box!.width}x${box!.height}`)
  const vw = page.viewportSize()!.width
  const vh = page.viewportSize()!.height
  assert.ok(box!.x >= 0 && box!.x + box!.width <= vw + 1, `${label}: close x out of viewport`)
  assert.ok(box!.y >= 0 && box!.y + box!.height <= vh + 1, `${label}: close y out of viewport`)

  const imgBox = await overlay.locator("img").last().boundingBox()
  if (imgBox) {
    assert.ok(imgBox.width <= vw + 2, `${label}: image wider than viewport ${imgBox.width}>${vw}`)
    assert.ok(imgBox.height <= vh + 2, `${label}: image taller than viewport ${imgBox.height}>${vh}`)
    assert.ok(imgBox.width > 80 && imgBox.height > 80, `${label}: image looks clipped ${imgBox.width}x${imgBox.height}`)
  }

  await assertNoHOverflow(page)
  await close.click()
  await overlay.first().waitFor({ state: "hidden" }).catch(async () => {
    assert.equal(await overlay.count(), 0, `${label}: still open after close`)
  })
}

async function tryOpenFirstZoom(page: Page): Promise<boolean> {
  const zoom = page.locator('button[aria-label^="Открыть"]').first()
  if (!(await zoom.count())) return false
  await zoom.click()
  return true
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  const widths = [320, 375] as const
  const results: Record<string, unknown> = { base: BASE, widths: {} }

  try {
    for (const w of widths) {
      await page.setViewportSize({ width: w, height: 700 })
      const row: Record<string, string> = {}

      // Licenses
      await page.goto(`${BASE}/company/licenses`, { waitUntil: "domcontentloaded", timeout: 60_000 })
      await dismissCookie(page)
      if (await tryOpenFirstZoom(page)) {
        await assertLightboxOk(page, `licenses@${w}`)
        row.licenses = "ok"
      } else {
        row.licenses = "skip-no-thumb"
      }

      // Testimonials review photos
      await page.goto(`${BASE}/testimonials`, { waitUntil: "domcontentloaded", timeout: 60_000 })
      await dismissCookie(page)
      if (await tryOpenFirstZoom(page)) {
        await assertLightboxOk(page, `testimonials@${w}`)
        row.testimonials = "ok"
      } else {
        row.testimonials = "skip-no-photo"
      }

      results.widths = { ...(results.widths as object), [w]: row }
    }

    console.log(JSON.stringify(results, null, 2))
    console.log("ok")
  } finally {
    await browser.close()
  }
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
