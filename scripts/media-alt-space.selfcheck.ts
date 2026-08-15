/**
 * #27: Alt inputs inside media picker cards must keep Space (not pick/close).
 * Run: npx tsx scripts/media-alt-space.selfcheck.ts
 */
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")

const explorer = fs.readFileSync(path.join(root, "components/admin/media-explorer.tsx"), "utf8")
assert.ok(
  explorer.includes("event.target !== event.currentTarget"),
  "explorer card ignores nested keydown (Alt Space)",
)

const mediaAlt = fs.readFileSync(path.join(root, "components/admin/media-alt-field.tsx"), "utf8")
assert.ok(mediaAlt.includes("event.stopPropagation()"), "MediaAltField stops keydown bubble")

const instanceAlt = fs.readFileSync(
  path.join(root, "components/admin/instance-alt-field.tsx"),
  "utf8",
)
assert.ok(instanceAlt.includes("event.stopPropagation()"), "InstanceAltField stops keydown bubble")

console.log("media-alt-space.selfcheck: ok")
