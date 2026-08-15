import { ok, match, doesNotMatch } from "node:assert/strict"
import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"

const root = process.cwd()
const heroSrc = readFileSync(join(root, "components/site/hero.tsx"), "utf8")
const officeMapSrc = (() => {
  const candidates = ["components/site/office-map.tsx", "components/site/company-map.tsx", "components/site/yandex-map.tsx"]
  for (const c of candidates) {
    try { return readFileSync(join(root, c), "utf8") } catch {}
  }
  const files = readdirSync(join(root, "components/site")).filter((f) => /map/i.test(f))
  if (files[0]) return readFileSync(join(root, "components/site", files[0]), "utf8")
  return ""
})()

// ============================================================
// BLOCK 4a: Hero hydration/perf + Block 4b iframe lazy
// ============================================================

const heroClean = heroSrc
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/\/\/[^\n]*/g, "")
// Hero: 1. Single H1 on page — NOT multiple <h1>s (slides must not each render H1)
const h1Count = (heroClean.match(/<h1\b/g) || []).length
ok(h1Count === 1, `Hero must have exactly ONE <h1> tag (found ${h1Count})`)

// Hero: 2. No motion/react import (replaced with CSS transitions)
doesNotMatch(heroSrc, /from ["']framer-motion["']|import.*motion.*from.*motion|@motion\.dev/,
  "hero.tsx: must NOT import framer-motion / motion/react — replaced with native CSS opacity transitions")

// Hero: 3. Native CSS opacity transitions present
match(heroSrc, /opacity|transition.*opacity|animate-in/i,
  "hero.tsx: must use native CSS opacity transition (instead of JS motion)")

// Hero: 4. Server-renders ONLY first slide. Either:
//   - i === 0 index guard during SSR (before client mounts), OR
//   - typeof window !== 'undefined' / isClient guard + Set([0]) with SSR bail-out.
match(
  heroClean,
  /typeof\s+window\s*!==\s*["']undefined["'][\s\S]{0,300}Set\s*\(\s*\[\s*0\s*\]\s*\)|visibleIndices\.has\(i\)[\s\S]{0,100}return\s*null|i\s*===\s*0\s*\?|i\s*===\s*0\s*&&|if\s*\(\s*i\s*!=\s*=\s*0\s*\)\s*return\s*null/i,
  "hero.tsx: must server-render ONLY first slide (isClient guard + Set([0]) OR i === 0 SSR-only check)",
)

// Block 4b: office map iframe loading=lazy attribute
ok(officeMapSrc.length > 0, "office/map component file found")
match(
  officeMapSrc,
  /<iframe[\s\S]{0,300}loading\s*=\s*["']lazy["']|loading\s*:\s*["']lazy["']/,
  "map component: <iframe> must have loading=\"lazy\" attribute — defer offscreen render",
)

console.log("perf-hero-hydration-office-map checks passed")
