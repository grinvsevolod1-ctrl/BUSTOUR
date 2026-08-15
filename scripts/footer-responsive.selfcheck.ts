/**
 * Footer trim + responsive layout lock.
 * Run: npx tsx scripts/footer-responsive.selfcheck.ts
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const footer = readFileSync(join(process.cwd(), "components/site/site-footer.tsx"), "utf8")
const layout = readFileSync(join(process.cwd(), "app/(site)/layout.tsx"), "utf8")

assert.doesNotMatch(footer, /site\.address|site\.emails|site\.hours|emergencyPhone/)
assert.match(footer, /aria-label="Направления"/)
assert.match(footer, /border-t border-line pt-4/)
assert.match(footer, /legalPages\.video/)
assert.match(footer, /md:grid md:grid-cols-2/)
assert.match(footer, /xl:flex xl:flex-row/)
assert.match(footer, /socialsForFooter/)
assert.match(footer, /getDisplayPhones/)
assert.match(footer, /legalPages\.offer/)
assert.match(footer, /legalPages\.privacy/)
assert.match(footer, /legalPages\.cookies/)
assert.match(footer, /SiteCookieSettingsLink/)
// Mobile footer legal links: text-sm, leading-5, gap-1 (not text-xs/leading-4/gap-2 — old broken mobile)
assert.match(footer, /flex flex-col gap-1 md:gap-0/)
assert.match(footer, /text-sm leading-5 text-cyan-accent underline underline-offset-3/)
assert.doesNotMatch(footer, /text-xs leading-4 text-cyan-accent underline underline-offset-2/)
assert.doesNotMatch(footer, /flex flex-col gap-2 md:gap-0/)

assert.match(layout, /getBlocks\("direction"/)
assert.match(layout, /directions=\{directions\}/)

console.log("footer-responsive.selfcheck: ok")
