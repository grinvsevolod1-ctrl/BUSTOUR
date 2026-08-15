/**
 * Multi FAQ: section slots (faq/faq2) + legacy multi-group parse.
 * Run: npx tsx scripts/multi-faq.selfcheck.ts
 */
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { groupFaqBlocks, parseFaqGroups, parseFaqPairs } from "@/lib/faq-form"
import {
  faqStoragePage,
  isFaqSectionKey,
  pageFaqFormId,
  buildFaqFormIds,
} from "@/lib/faq-slots"

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")

assert.equal(faqStoragePage("hot", "faq"), "hot")
assert.equal(faqStoragePage("hot", "faq2"), "hot::faq2")
assert.ok(isFaqSectionKey("faq"))
assert.ok(isFaqSectionKey("faq3"))
assert.ok(!isFaqSectionKey("seo2"))

// Server pages call these — must live in lib/, not in a "use client" module.
assert.equal(pageFaqFormId("hot", "faq"), "page-faq-form-hot-faq")
assert.equal(pageFaqFormId("city:hot:hurghada", "faq2"), "page-faq-form-city-hot-hurghada-faq2")
assert.deepEqual(buildFaqFormIds("hot", ["faq", "seo"], 0), ["page-faq-form-hot-faq"])
assert.deepEqual(buildFaqFormIds("hot", ["faq", "faq2"], 0), [
  "page-faq-form-hot-faq",
  "page-faq-form-hot-faq2",
])

{
  const clientFaqForm = fs.readFileSync(path.join(root, "components/admin/page-faq-form.tsx"), "utf8")
  assert.ok(clientFaqForm.startsWith('"use client"'), "PageFaqForm is client")
  assert.ok(
    !/export function pageFaqFormId/.test(clientFaqForm),
    "pageFaqFormId must not be defined in client module (server pages call it)",
  )
  assert.ok(
    clientFaqForm.includes('from "@/lib/faq-slots"'),
    "client form imports pageFaqFormId from lib",
  )

  const hotAdmin = fs.readFileSync(path.join(root, "app/admin/(protected)/pages/hot/page.tsx"), "utf8")
  assert.ok(
    hotAdmin.includes("buildFaqFormIds") && hotAdmin.includes('from "@/lib/faq-slots"'),
    "hot admin imports buildFaqFormIds from lib/faq-slots (server-safe)",
  )
}
{
  const fd = new FormData()
  fd.append("faqQuestion", "Q1")
  fd.append("faqAnswer", "A1")
  fd.append("faqQuestion", "Q2")
  fd.append("faqAnswer", "A2")
  assert.deepEqual(parseFaqPairs(fd), [
    { question: "Q1", answer: "A1" },
    { question: "Q2", answer: "A2" },
  ])
  const groups = parseFaqGroups(fd)
  assert.equal(groups.length, 1)
  assert.equal(groups[0]!.title, "")
  assert.equal(groups[0]!.items.length, 2)
}

{
  const fd = new FormData()
  fd.append("faqGroupTitle", "Оплата")
  fd.append("faqGroupTitle", "Визы")
  fd.append("faqQuestion", "Как платить?")
  fd.append("faqAnswer", "Картой")
  fd.append("faqGroup", "0")
  fd.append("faqQuestion", "Нужна виза?")
  fd.append("faqAnswer", "Да")
  fd.append("faqGroup", "1")
  fd.append("faqQuestion", "Рассрочка?")
  fd.append("faqAnswer", "Да")
  fd.append("faqGroup", "0")
  const groups = parseFaqGroups(fd)
  assert.equal(groups.length, 2)
  assert.equal(groups[0]!.title, "Оплата")
  assert.equal(groups[0]!.items.length, 2)
  assert.equal(groups[1]!.title, "Визы")
  assert.equal(groups[1]!.items[0]!.question, "Нужна виза?")
}

{
  const blocks = [
    { id: 1, title: "Q1", body: "A1", subtitle: "Оплата" },
    { id: 2, title: "Q2", body: "A2", subtitle: "Оплата" },
    { id: 3, title: "Q3", body: "A3", subtitle: "Визы" },
  ]
  const grouped = groupFaqBlocks(blocks, "Частые вопросы")
  assert.equal(grouped.length, 2)
  assert.equal(grouped[0]!.title, "Оплата")
  assert.equal(grouped[1]!.title, "Визы")
}

const mgr = fs.readFileSync(path.join(root, "components/admin/page-sections-manager.tsx"), "utf8")
assert.ok(mgr.includes('"faq"'), "faq multipliable in PageSectionsManager")

const editor = fs.readFileSync(path.join(root, "components/admin/faq-editor.tsx"), "utf8")
assert.ok(!editor.includes("Блок ЧаВо"), "Блок ЧаВо removed from FaqEditor")
assert.ok(editor.includes("RichEditor"), "FAQ answer uses RichEditor")

const hotAdmin = fs.readFileSync(path.join(root, "app/admin/(protected)/pages/hot/page.tsx"), "utf8")
assert.ok(hotAdmin.includes("buildFaqSlots"), "hot admin uses buildFaqSlots")
assert.ok(hotAdmin.includes("getFaqBlocksForPage"), "hot admin loads all FAQ slots")

const hotPublic = fs.readFileSync(path.join(root, "app/(site)/hot/page.tsx"), "utf8")
assert.ok(
  hotPublic.includes("OrderedFaqSection") || hotPublic.includes("DestinationSectionMap"),
  "hot public renders numbered FAQ sections",
)
const destMap = fs.readFileSync(
  path.join(root, "components/site/catalog/destination-section-map.tsx"),
  "utf8",
)
assert.ok(destMap.includes("OrderedFaqSection"), "DestinationSectionMap renders FAQ")

console.log("multi-faq.selfcheck: ok")
