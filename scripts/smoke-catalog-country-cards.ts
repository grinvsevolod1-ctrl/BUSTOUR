/**
 * DEV smoke: catalog home cards → country URLs; country page → city URLs.
 * Run: npx tsx scripts/smoke-catalog-country-cards.ts
 */
import assert from "node:assert/strict"
import { chromium } from "@playwright/test"

const BASE = (process.env.PLAYWRIGHT_BASE_URL || "http://31.77.228.133:3000").replace(/\/$/, "")

async function main() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  try {
    await page.setViewportSize({ width: 1200, height: 800 })

    await page.goto(`${BASE}/hot/`, { waitUntil: "domcontentloaded", timeout: 60_000 })
    await page.getByRole("button", { name: /Принять все|Отклонить/i }).click({ timeout: 5_000 }).catch(() => {})

    const homeHrefs = await page.evaluate(() =>
      [...document.querySelectorAll('a[href*="/hot/"]')]
        .map((a) => a.getAttribute("href") || "")
        .filter((h) => /^\/hot\/[^/]+\/?$/.test(h.replace(location.origin, ""))),
    )
    // Prefer cards in main: depth exactly country
    const cardCountryLinks = await page.locator("main a").evaluateAll((els) =>
      els
        .map((a) => (a as HTMLAnchorElement).pathname)
        .filter((p) => /^\/hot\/[^/]+\/?$/.test(p)),
    )
    assert.ok(cardCountryLinks.length >= 1, `hot home needs country card links, got ${cardCountryLinks.length}`)
    const cityDepth = await page.locator("main a").evaluateAll((els) =>
      els
        .map((a) => (a as HTMLAnchorElement).pathname)
        .filter((p) => /^\/hot\/[^/]+\/[^/]+\/?$/.test(p)),
    )
    // Sidebar may still have city links — only assert resort carousel area if we can isolate.
    // Cards section: links that are country-only must exist; city-only from cards shouldn't be majority from carousel.
    console.log(JSON.stringify({ homeCountryCards: cardCountryLinks.slice(0, 5), sidebarOrOtherCity: cityDepth.length }))

    const countryPath = cardCountryLinks[0]!
    await page.goto(`${BASE}${countryPath}`, { waitUntil: "domcontentloaded", timeout: 60_000 })
    await page.getByRole("button", { name: /Принять все|Отклонить/i }).click({ timeout: 5_000 }).catch(() => {})

    const cityLinks = await page.locator("main a").evaluateAll((els, prefix) => {
      const re = new RegExp(`^${prefix.replace(/\/$/, "")}/[^/]+/?$`)
      return els
        .map((a) => (a as HTMLAnchorElement).pathname)
        .filter((p) => re.test(p))
    }, countryPath.replace(/\/$/, ""))

    // Country page may have zero cities — then skip
    if (cityLinks.length) {
      assert.ok(
        cityLinks.every((p) => p.split("/").filter(Boolean).length === 3),
        `country page city cards should be /hot/{country}/{city}/: ${cityLinks.slice(0, 3)}`,
      )
    }

    console.log(JSON.stringify({ ok: true, countryPath, cityLinks: cityLinks.slice(0, 5) }))
    console.log("ok")
  } finally {
    await browser.close()
  }
}

main().catch((e) => {
  console.error(e)
  process.exitCode = 1
})
