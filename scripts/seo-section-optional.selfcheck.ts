/**
 * Extended SEO page sections (seo / seo2…) must not mark fields required.
 * Run: npx tsx scripts/seo-section-optional.selfcheck.ts
 */
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const adminRoot = path.join(root, "app", "admin", "(protected)")

const targets = [
  "cities/[id]/page.tsx",
  "countries/[id]/page.tsx",
  "buses/[id]/page.tsx",
  "transfers/[id]/page.tsx",
  "articles/[id]/page.tsx",
  "pages/hot/page.tsx",
  "pages/bus-home/page.tsx",
  "pages/aviatory-home/page.tsx",
  "pages/rental/page.tsx",
]

for (const rel of targets) {
  const src = fs.readFileSync(path.join(adminRoot, rel), "utf8")
  assert.ok(src.includes("seoHtml${suffix}") || src.includes("seoHtml"), `${rel}: has seo slots`)
  // Slot builders must not force required on numbered/base SEO fields
  assert.ok(!/seoHtml\$\{suffix\}[\s\S]{0,120}required\s*:/.test(src), `${rel}: seoHtml must not be required`)
  assert.ok(!/seoTitle\$\{suffix\}[\s\S]{0,120}required\s*:/.test(src), `${rel}: seoTitle must not be required`)
  assert.ok(!src.includes("required: n === 1"), `${rel}: no required: n === 1 on SEO slots`)
}

console.log("seo-section-optional.selfcheck: ok")
