import { test, expect, type Page } from "@playwright/test"

/**
 * Admin smoke test: login (via global.setup storageState) →
 * create a bus tour → verify it renders on the public site →
 * archive it in `finally` so a mid-test failure never pollutes the DB.
 */

const RUN_ID = Date.now().toString(36)
const TOUR_TITLE = `E2E Smoke Tour ${RUN_ID}`
const TOUR_SLUG = `e2e-smoke-tour-${RUN_ID}`

async function pickCombobox(page: Page, name: string, preferred?: string) {
  // AdminCombobox renders <div class="relative"> containing both the hidden
  // input[name] and the visible role=combobox input — scope by that container.
  const input = page
    .locator(`div.relative:has(> input[type="hidden"][name="${name}"]) input[role="combobox"]`)
    .first()
  await input.click()
  if (preferred) await input.fill(preferred)
  const option = page.locator('[role="option"]').first()
  await expect(option, `no options for combobox "${name}"`).toBeVisible({ timeout: 10_000 })
  await option.click()
}

async function archiveSmokeTour(page: Page) {
  await page.goto("/admin/tours")
  const row = page.locator("tr, li, article").filter({ hasText: TOUR_TITLE }).first()
  if (!(await row.count())) return
  const archive = row.locator("button, a").filter({ hasText: /Архив|Удал/i }).first()
  if (await archive.count()) {
    await archive.click()
    const confirm = page.locator("button").filter({ hasText: /Подтверд|Да|Архив|Удал/i }).first()
    if (await confirm.count()) await confirm.click().catch(() => {})
  }
}

test.describe("admin smoke", () => {
  test("dashboard is reachable after login", async ({ page }) => {
    await page.goto("/admin")
    await expect(page).not.toHaveURL(/\/admin\/login/)
  })

  test("create tour and verify on public site", async ({ page }) => {
    try {
      await page.goto("/admin/tours/new")
      await expect(page.locator("#tour-form")).toBeVisible({ timeout: 15_000 })

      // --- Required text fields
      await page.fill('input[name="title"], #tour-title', TOUR_TITLE)
      const slugField = page.locator('input[name="slug"]')
      if (await slugField.count()) await slugField.first().fill(TOUR_SLUG)
      const description = page.locator('textarea[name="description"], input[name="description"]')
      await description.first().fill("Автоматический smoke-тест: тур создан Playwright и будет заархивирован.")

      // --- Country / city comboboxes (must pick existing options)
      await pickCombobox(page, "country")
      await pickCombobox(page, "arrivalCity")

      // --- Cover image: sr-only text input when required — set value via DOM
      const imageInput = page.locator('input[name="image"]')
      if (await imageInput.count()) {
        await imageInput.first().evaluate((el, v) => {
          const input = el as HTMLInputElement
          input.value = v
          input.dispatchEvent(new Event("input", { bubbles: true }))
          input.dispatchEvent(new Event("change", { bubbles: true }))
        }, "/images/karelia-lake.png")
      }

      // --- Price
      const price = page.locator('input[name="priceAmount"]')
      if (await price.count()) await price.first().fill("199")

      // --- Submit and wait for the admin redirect (…/admin/tours/{id}?notice=…)
      await page.locator('#tour-form button[type="submit"], button[form="tour-form"]').first().click()
      await page.waitForURL(/\/admin\/tours\/\d+/, { timeout: 30_000 })
      await expect(page.locator("body")).not.toContainText("уже существует")

      // --- Verify on the public site
      const publicResponse = await page.goto(`/tour/${TOUR_SLUG}`)
      expect(publicResponse, "public tour page must respond").toBeTruthy()
      expect(publicResponse!.status(), "public tour page must not 404").toBeLessThan(400)
      await expect(page.locator("h1")).toContainText(TOUR_TITLE, { timeout: 15_000 })
    } finally {
      // Teardown must run even when the assertions above fail mid-test.
      await archiveSmokeTour(page).catch(() => {})
    }
  })
})
