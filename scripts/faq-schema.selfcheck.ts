/**
 * FAQPage JSON-LD shape + public FAQ render wiring.
 * Run: npx tsx scripts/faq-schema.selfcheck.ts
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import {
  buildFaqPageJsonLd,
  normalizeFaqSchemaItems,
  serializeJsonLd,
  stripFaqHtml,
} from "../lib/faq-schema"

const root = process.cwd()

// ── Pure builder shape ─────────────────────────────────────────────────
const page = buildFaqPageJsonLd([
  {
    question: "Как <b>оплатить</b>?",
    answer: "<p>Картой или наличными. Год [Y] уже раскрыт.</p>",
  },
  { question: "  ", answer: "пусто" },
  { question: "Нужна виза?", answer: "Для большинства направлений — нет." },
])

assert.ok(page, "builds FAQPage when valid pairs exist")
assert.equal(page!["@context"], "https://schema.org")
assert.equal(page!["@type"], "FAQPage")
assert.equal(page!.mainEntity.length, 2)

const q0 = page!.mainEntity[0]
assert.equal(q0["@type"], "Question")
assert.equal(q0.name, "Как оплатить ?")
assert.equal(q0.acceptedAnswer["@type"], "Answer")
assert.equal(q0.acceptedAnswer.text, "Картой или наличными. Год [Y] уже раскрыт.")
assert.equal(page!.mainEntity[1].name, "Нужна виза?")
assert.ok(!/</.test(q0.name), "question text has no HTML tags")
assert.equal(buildFaqPageJsonLd([]), null)
assert.equal(buildFaqPageJsonLd([{ question: "<br>", answer: "<p></p>" }]), null)

assert.equal(stripFaqHtml("<script>x</script>Hi"), "Hi")
assert.deepEqual(normalizeFaqSchemaItems([{ question: " Q ", answer: " A " }]), [
  { question: "Q", answer: "A" },
])

const serialized = serializeJsonLd(page)
assert.match(serialized, /"@type":"FAQPage"/)

// Round-trip: escaped payload parses back
const revived = JSON.parse(serialized) as typeof page
assert.equal(revived!["@type"], "FAQPage")
assert.equal(revived!.mainEntity[0].name, "Как оплатить ?")

const withLt = serializeJsonLd(buildFaqPageJsonLd([{ question: "A < B?", answer: "Да, a < b." }]))
assert.ok(withLt.includes("\\u003c"), "escapes < as \\\\u003c for script safety")
assert.doesNotMatch(withLt, /</)
assert.equal(JSON.parse(withLt).mainEntity[0].name, "A < B?")

// ── Public render path wiring ──────────────────────────────────────────
const faqJsonLd = readFileSync(join(root, "components/site/faq-json-ld.tsx"), "utf8")
assert.match(faqJsonLd, /buildFaqPageJsonLd/)
assert.match(faqJsonLd, /serializeJsonLd/)
assert.match(faqJsonLd, /application\/ld\+json/)

const ordered = readFileSync(join(root, "components/site/ordered-faq-section.tsx"), "utf8")
assert.match(ordered, /FaqJsonLd/)
assert.match(ordered, /expandContentBlocks/)
assert.match(ordered, /schemaItems/)

const extras = readFileSync(join(root, "components/site/page-extras.tsx"), "utf8")
assert.match(extras, /FaqJsonLd/)
assert.match(extras, /expandContentBlocks/)

const lib = readFileSync(join(root, "lib/faq-schema.ts"), "utf8")
assert.match(lib, /FAQPage/)
assert.match(lib, /mainEntity/)
assert.match(lib, /acceptedAnswer/)

// Org / TravelAgency / Breadcrumb stay intact (do not regress)
const layout = readFileSync(join(root, "app/(site)/layout.tsx"), "utf8")
assert.match(layout, /TravelAgency/)
assert.match(layout, /application\/ld\+json/)

const crumb = readFileSync(join(root, "components/site/breadcrumb.tsx"), "utf8")
assert.match(crumb, /BreadcrumbList/)
assert.match(crumb, /getSiteOrigin/, "breadcrumb JSON-LD uses CMS site.url")
assert.doesNotMatch(crumb, /const BASE_URL = process\.env\.NEXT_PUBLIC_SITE_URL/, "no hardcoded env-only breadcrumb base")

console.log("faq-schema.selfcheck: ok")
