/**
 * Every metadataFromSettings call must pass options.path for canonical.
 * Run: npx tsx scripts/seo-canonical-path.selfcheck.ts
 */
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

const root = path.join(import.meta.dirname, "..")
const siteRoot = path.join(root, "app", "(site)")

function walk(dir: string): string[] {
  const out: string[] = []
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) out.push(...walk(p))
    else if (ent.name.endsWith(".tsx") || ent.name.endsWith(".ts")) out.push(p)
  }
  return out
}

const missing: string[] = []
for (const file of walk(siteRoot)) {
  const src = fs.readFileSync(file, "utf8")
  if (!src.includes("metadataFromSettings")) continue
  // Split on calls; require nearby `{ path:` or `path:` in options object after the call start
  const re = /metadataFromSettings\s*\(/g
  let m: RegExpExecArray | null
  while ((m = re.exec(src))) {
    const slice = src.slice(m.index, m.index + 600)
    if (!/\bpath\s*:/.test(slice)) {
      missing.push(`${path.relative(root, file)} @${m.index}`)
    }
  }
}

assert.deepEqual(missing, [], `missing path canonical:\n${missing.join("\n")}`)
console.log("seo-canonical-path.selfcheck: ok")
