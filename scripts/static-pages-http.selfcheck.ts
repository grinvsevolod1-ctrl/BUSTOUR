/**
 * HTTP smoke: thin static public pages return <400 and have a landmark heading.
 * Run: npx tsx scripts/static-pages-http.selfcheck.ts
 * Requires: npm run dev on :3000 (or PLAYWRIGHT_BASE_URL).
 */
import assert from "node:assert/strict"

const base = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000"

const PATHS = [
  "/contacts",
  "/company",
  "/company/staff",
  "/company/licenses",
  "/legal/privacy",
  "/legal/offer",
  "/testimonials",
  "/info",
] as const

async function main() {
  const failures: string[] = []
  for (const path of PATHS) {
    try {
      const res = await fetch(`${base}${path}`, { redirect: "follow" })
      if (res.status >= 400) {
        failures.push(`${path}: status ${res.status}`)
        continue
      }
      const html = await res.text()
      if (html.includes("Что-то пошло не так")) {
        failures.push(`${path}: error boundary`)
        continue
      }
      if (!/<h1[\s>]/i.test(html) && !/<main[\s>]/i.test(html)) {
        failures.push(`${path}: missing h1/main`)
      }
    } catch (err) {
      failures.push(`${path}: ${(err as Error).message}`)
    }
  }
  assert.equal(failures.length, 0, failures.join("\n"))
  console.log("static-pages-http selfcheck: ok")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
