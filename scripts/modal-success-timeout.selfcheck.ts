/**
 * #34: success setTimeout(onClose) must clear on unmount.
 * Run: npx tsx scripts/modal-success-timeout.selfcheck.ts
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const root = process.cwd()
const read = (rel: string) => readFileSync(join(root, rel), "utf8")

const shell = read("components/site/modals/site-modal-shell.tsx")
assert.ok(shell.includes("useScheduleModalClose"), "shared schedule helper")
assert.ok(shell.includes("clearTimeout"), "helper clears timeout")
assert.match(
  shell,
  /return\s*\(\)\s*=>\s*\{[\s\S]*clearTimeout\(closeTimer\.current\)/,
  "unmount cleanup clears closeTimer",
)

const bareClose = /setTimeout\(\s*onClose\s*,\s*2500\s*\)/
const modals = [
  "components/site/modals/modal-bus-order.tsx",
  "components/site/modals/modal-tour-order.tsx",
  "components/site/modals/modal-testimonial.tsx",
] as const

for (const rel of modals) {
  const src = read(rel)
  assert.ok(src.includes("useScheduleModalClose"), `${rel}: uses shared helper`)
  assert.ok(src.includes("scheduleClose()"), `${rel}: calls scheduleClose`)
  assert.ok(!bareClose.test(src), `${rel}: no bare setTimeout(onClose, 2500)`)
}

const float = read("components/site/callback-modal.tsx")
assert.ok(float.includes("clearTimeout"), "float callback clears timeout")
assert.ok(float.includes("scheduleClose") || float.includes("closeTimer"), "float callback tracks timer")
assert.ok(!bareClose.test(float), "float callback: no bare setTimeout(onClose, 2500)")

console.log("ok")
