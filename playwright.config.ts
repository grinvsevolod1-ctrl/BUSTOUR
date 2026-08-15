import { defineConfig, devices } from "@playwright/test"
import path from "node:path"

const authFile = path.join(__dirname, "e2e", ".auth", "admin.json")
const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000"

export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  forbidOnly: !!process.env.CI,
  reporter: [
    ["list"],
    ["json", { outputFile: "playwright-report/test-results.json" }],
    ["html", { outputFolder: "playwright-report/html", open: "never" }],
    ["junit", { outputFile: "playwright-report/junit.xml" }],
  ],
  expect: {
    toHaveScreenshot: {
      // Live baselines: regenerate with `npm run test:visual:update`
      maxDiffPixelRatio: 0.04,
      animations: "disabled",
      caret: "hide",
    },
  },
  // Keep visual PNGs under e2e/visual/__baselines__/ (committed live pins)
  snapshotPathTemplate:
    "{testDir}/visual/__baselines__/{testFileName}/{arg}{-projectName}{ext}",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run dev",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
  projects: [
    { name: "setup", testMatch: /global\.setup\.ts/ },
    {
      name: "chromium",
      dependencies: ["setup"],
      // hanging-tours-city mutates seed tours — opt-in: --project=migration
      // visual pins — opt-in: --project=visual
      testIgnore: [
        /global\.setup\.ts/,
        /hanging-tours-city\.spec\.ts/,
        /visual\/.*\.visual\.spec\.ts/,
      ],
      use: {
        ...devices["Desktop Chrome"],
        storageState: authFile,
      },
    },
    {
      name: "visual",
      dependencies: ["setup"],
      testMatch: /visual\/.*\.visual\.spec\.ts/,
      timeout: 180_000,
      use: {
        ...devices["Desktop Chrome"],
        // Per-file storageState overrides (admin login stays anonymous)
        storageState: authFile,
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: "migration",
      dependencies: ["setup"],
      testMatch: /hanging-tours-city\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        storageState: authFile,
      },
    },
  ],
})