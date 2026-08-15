import { test as setup, expect } from "@playwright/test"
import path from "node:path"

const authFile = path.join(__dirname, ".auth", "admin.json")

/**
 * Logs in once and persists the session cookie for all test projects.
 * Credentials come from env (fall back to the local-dev defaults).
 */
setup("authenticate as admin", async ({ page }) => {
  const username = process.env.E2E_ADMIN_USERNAME || process.env.ADMIN_USERNAME || "admin"
  const password = process.env.E2E_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || "admin123"

  await page.goto("/admin/login")
  await page.fill('input[name="username"]', username)
  await page.fill('input[name="password"]', password)
  await page.click('button[type="submit"]')

  // Successful login redirects into the protected admin area.
  await page.waitForURL(/\/admin(?!\/login)/, { timeout: 15_000 })
  await expect(page.locator("body")).not.toContainText("Неверный логин")

  await page.context().storageState({ path: authFile })
})
