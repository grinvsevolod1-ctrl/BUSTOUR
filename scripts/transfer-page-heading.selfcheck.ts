/**
 * #100/#103: transfer short title vs page H1; H1 under Название; order tab not empty.
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { transferPageHeading } from "@/lib/transfer-display"
import { resolveInitialOrder } from "@/lib/section-order"

assert.equal(
  transferPageHeading({ "transfer:vnukovo.h1": "Трансфер в аэропорт Внуково" }, "transfer:vnukovo", "Внуково"),
  "Трансфер в аэропорт Внуково",
)
assert.equal(
  transferPageHeading({ "transfer:vnukovo.h1": "  " }, "transfer:vnukovo", "Внуково"),
  "Внуково",
  "blank h1 falls back to short title",
)
assert.equal(
  transferPageHeading({}, "transfer:vnukovo", "Внуково"),
  "Внуково",
  "missing h1 falls back to short title",
)

// Empty / invalid saved order must not wipe the order tab
assert.deepEqual(
  resolveInitialOrder("[]", ["seo", "schedules", "faq", "callus"], ["seo", "schedules", "faq", "callus"], [
    "faq",
    "callus",
  ]),
  ["seo", "schedules", "faq", "callus"],
  "empty JSON order falls back to default",
)
assert.deepEqual(
  resolveInitialOrder("", ["seo", "schedules", "faq", "callus"], ["seo", "schedules", "faq", "callus"], [
    "faq",
    "callus",
  ]),
  ["seo", "schedules", "faq", "callus"],
  "empty string order falls back to default",
)

const form = readFileSync(join(process.cwd(), "components/admin/transfer-base-form.tsx"), "utf8")
assert.match(form, />Название</, "admin title label is Название")
assert.match(form, /Заголовок страницы/, "page heading field under base form")
assert.match(form, /pageHeadingKey|transfer:.*\.h1/, "page heading binds CMS h1 key")

const config = readFileSync(join(process.cwd(), "lib/admin-config.ts"), "utf8")
const transferConfig = config.slice(config.indexOf("export function transferPageConfig"))
assert.doesNotMatch(
  transferConfig.slice(0, transferConfig.indexOf("export function aviaCountryPageConfig")),
  /\$\{p\}\.h1/,
  "h1 must not live in transfer SEO group",
)

const admin = readFileSync(join(process.cwd(), "app/admin/(protected)/transfers/[id]/page.tsx"), "utf8")
assert.match(admin, /pageHeadingKey=\{`\$\{pageKey\}\.h1`\}/, "edit page passes h1 into base form")
assert.doesNotMatch(admin, /id:\s*["']faq["']/, "no orphan FAQ workspace tab")
assert.match(admin, /id:\s*["']main["']/)
assert.match(admin, /id:\s*["']content["']/)
assert.match(admin, /id:\s*["']schedules["']/)
assert.match(admin, /id:\s*["']order["']/)
assert.match(admin, /seoHtml\$\{suffix\}/, "seo slots like buses")
assert.doesNotMatch(admin, /contentTitle|contentHtml|sec-content/, "no legacy content section")

const detail = readFileSync(join(process.cwd(), "app/(site)/info/transfers/[slug]/page.tsx"), "utf8")
assert.match(detail, /transferPageHeading/, "detail page uses dual-title helper")
assert.match(detail, /withTransferSeoAlias/, "public page aliases legacy content→seo")
assert.match(detail, /label:\s*transfer\.title/, "breadcrumb uses short title")
assert.match(detail, /key === "seo"/, "public renders seo section")
assert.doesNotMatch(detail, /contentTitle|key === "content"/, "no legacy content keys on public")

const list = readFileSync(join(process.cwd(), "app/(site)/info/transfers/page.tsx"), "utf8")
assert.match(list, /title=\{transfer\.title\}/, "listing cards use short title")

console.log("transfer-page-heading.selfcheck: ok")
