/**
 * Admin sidebar accordion + dark shell wiring.
 * Run: npx tsx scripts/admin-nav-sidebar.selfcheck.ts
 */
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "path"
import { fileURLToPath } from "node:url"

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const src = fs.readFileSync(path.join(root, "components/admin/admin-nav.tsx"), "utf8")

assert.match(src, /bg-\[#1E232A\]|#1E232A/)
assert.match(src, /bustour-admin-nav-open/)
assert.match(src, /Операции/)
assert.match(src, /Каталог и туры/)
assert.match(src, /Контент и SEO/)
assert.match(src, /Управление/)
assert.match(src, /Открыть сайт/)
assert.match(src, /target="_blank"/)
assert.match(src, /logoutAction/)
assert.match(src, /badge === ['"]leads['"]/)
assert.match(src, /bg-red-500/)
assert.match(src, /bg-blue-600/)
assert.match(src, /Автобусные туры/)
assert.match(src, /\/admin\/tours/)
assert.match(src, /\/admin\/pages\/bus-home/)
assert.match(src, /\/admin\/leads/)
assert.match(src, /overflow-y-auto/)
assert.match(src, /aria-expanded/)
assert.match(src, /motion-reduce:transition-none/)

console.log("admin-nav-sidebar.selfcheck: ok")
