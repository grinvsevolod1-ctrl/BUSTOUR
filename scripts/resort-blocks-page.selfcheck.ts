/** Public resort tables must match the corresponding admin page exactly. */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const cms = readFileSync(join(process.cwd(), "lib/cms.ts"), "utf8")
assert.match(
  cms,
  /getResortBlocksForPage[\s\S]*?getBlocks\("resort", \{ page, onlyVisible: true \}\)/,
  "public tables are page-scoped and visible",
)
assert.doesNotMatch(cms, /pickResortBlocksForPage|RESORT_GLOBAL_PAGE/, "no global fallback")

const seed = readFileSync(join(process.cwd(), "lib/db/cms-seed.ts"), "utf8")
assert.doesNotMatch(seed, /collection:\s*["']resort["']/, "no hidden resort demo seed")

const init = readFileSync(join(process.cwd(), "lib/db/init.ts"), "utf8")
assert.doesNotMatch(init, /DELETE FROM content_blocks WHERE collection = 'resort'/, "startup must not destructively delete resort rows")

const siteRoot = join(process.cwd(), "app/(site)")
const mustUse = [
  "avtobusnye-tury/page.tsx",
  "avtobusnye-tury/[countrySlug]/page.tsx",
  "avtobusnye-tury/[countrySlug]/[citySlug]/page.tsx",
  "aviatory/page.tsx",
  "aviatory/[countrySlug]/page.tsx",
  "aviatory/[countrySlug]/[citySlug]/page.tsx",
  "hot/page.tsx",
  "hot/[countrySlug]/page.tsx",
  "hot/[countrySlug]/[citySlug]/page.tsx",
  "bus-rental/[slug]/page.tsx",
]
for (const rel of mustUse) {
  const src = readFileSync(join(siteRoot, rel), "utf8")
  assert.match(src, /getResortBlocksForPage/, `${rel} uses getResortBlocksForPage`)
  assert.doesNotMatch(
    src,
    /getBlocks\(\s*[\"']resort[\"']/,
    `${rel} no direct getBlocks(\"resort\")`,
  )
}

console.log("resort-blocks-page.selfcheck: ok")
