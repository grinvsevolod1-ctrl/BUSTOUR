/**
 * #102: bus short title (cards/crumbs) vs page H1 (`bus:{slug}.h1`).
 * Run: npx tsx scripts/bus-page-heading.selfcheck.ts
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { busPageHeading } from "@/lib/bus-display"

assert.equal(
  busPageHeading({ "bus:neoplan.h1": "Аренда Neoplan 122" }, "bus:neoplan", "Neoplan 122"),
  "Аренда Neoplan 122",
)
assert.equal(
  busPageHeading({ "bus:neoplan.h1": "  " }, "bus:neoplan", "Neoplan 122"),
  "Neoplan 122",
  "blank h1 falls back to short title",
)
assert.equal(
  busPageHeading({}, "bus:neoplan", "Neoplan 122"),
  "Neoplan 122",
  "missing h1 falls back to short title",
)

const form = readFileSync(join(process.cwd(), "components/admin/bus-base-form.tsx"), "utf8")
assert.match(form, />Название</, "admin title label is Название")
assert.match(form, /Заголовок страницы/, "page heading field under base form")
assert.match(form, /pageHeadingKey|bus:.*\.h1/, "page heading binds CMS h1 key")

const config = readFileSync(join(process.cwd(), "lib/admin-config.ts"), "utf8")
const busConfig = config.slice(config.indexOf("export function busPageConfig"))
assert.doesNotMatch(
  busConfig.slice(0, busConfig.indexOf("export function transferPageConfig")),
  /\$\{p\}\.h1/,
  "h1 must not live in bus SEO group",
)

const admin = readFileSync(join(process.cwd(), "app/admin/(protected)/buses/[id]/page.tsx"), "utf8")
assert.match(admin, /pageHeadingKey=\{`\$\{pageKey\}\.h1`\}/, "edit page passes h1 into base form")

const detail = readFileSync(join(process.cwd(), "app/(site)/bus-rental/[slug]/page.tsx"), "utf8")
assert.match(detail, /busPageHeading/, "detail page uses dual-title helper")
assert.match(detail, /label:\s*bus\.title/, "breadcrumb uses short title")

const list = readFileSync(join(process.cwd(), "app/(site)/bus-rental/page.tsx"), "utf8")
assert.match(list, /\{bus\.title\}/, "listing cards use short title")

console.log("bus-page-heading.selfcheck: ok")
