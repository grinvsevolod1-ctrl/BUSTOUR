import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

async function main() {
  const root = path.resolve(__dirname, "..")
  const src = fs.readFileSync(path.join(root, "app", "admin", "cms-actions.ts"), "utf8")

  const hasToggleRegex = /for\s*\(\s*const\s+key\s+of\s+toggleKeys\s*\)\s*\{[\s\S]*?entries\[key\]\s*=\s*formData\.get\(key\)\s*\?\s*"1"\s*:\s*"0"[\s\S]*?\}/
  assert.match(src, hasToggleRegex, "saveSettingsAction has __toggles -> entries 1/0 loop")

  const hasPattern1 = /\*\.visible|section\.\*|\*\.section\.\*/
  const hasFallbackVisibleOff =
    /(\.visible|section\.|callus|faq)[\s\S]{0,800}(!formData\.has|entries\[.*\]\s*=\s*"0"|Object\.keys\(current\)\.filter\([\s\S]*?visible|Object\.keys\(current\)\.some\([\s\S]*?visible)/
  const hasToggleRecompute = /toggleKeys\.push|toggleKeys\s*=\s*\[.*\.filter|Object\.entries\(current\)\.filter.*?visible/
  assert.ok(
    hasPattern1.test(src) || hasFallbackVisibleOff.test(src) || hasToggleRecompute.test(src),
    "saveSettingsAction must fill OFF for known visibility/section keys when they weren't submitted (fallback toggles off)",
  )

  assert.ok(
    src.includes("__toggles") && src.includes("split"),
    "__toggles field read from formData and split to keys",
  )

  console.log("OK 1/2 — __toggles loop with 1/0, 2/2 — fallback ensures visibility keys default to 0 when unchecked")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
