/**
 * Tour detail hero: no horizontal overflow @320 from info chips / gallery column.
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const page = readFileSync(join(process.cwd(), "components/site/tour-page-content.tsx"), "utf8")
const gallery = readFileSync(join(process.cwd(), "components/site/tour-gallery.tsx"), "utf8")

assert.match(page, /min-w-0 space-y-6/, "hero column min-w-0 in lg grid")
assert.match(page, /flex min-w-0 items-center/, "info chips shrink-safe")
assert.match(page, /min-w-0 leading-tight/, "info text column min-w-0")
assert.match(page, /break-words/, "long chip values wrap")
assert.match(gallery, /flex w-full min-w-0/, "gallery root min-w-0")

console.log("tour-page-overflow.selfcheck: ok")
