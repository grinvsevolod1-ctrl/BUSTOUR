/**
 * #110: legacy transfer content* settings alias to seo*.
 * Run: npx tsx scripts/transfer-seo-alias.selfcheck.ts
 */
import assert from "node:assert/strict"
import { withTransferSeoAlias } from "@/lib/transfer-display"

const pageKey = "transfer:vnukovo"

const aliased = withTransferSeoAlias(
  {
    [`${pageKey}.contentTitle`]: "Подробнее",
    [`${pageKey}.contentHtml`]: "<p>hi</p>",
    [`${pageKey}.section.content`]: "0",
    [`${pageKey}.sections.order`]: '["content","schedules","faq"]',
  },
  pageKey,
)

assert.equal(aliased[`${pageKey}.seoTitle`], "Подробнее")
assert.equal(aliased[`${pageKey}.seoHtml`], "<p>hi</p>")
assert.equal(aliased[`${pageKey}.section.seo`], "0")
assert.equal(aliased[`${pageKey}.sections.order`], '["seo","schedules","faq"]')

const keepSeo = withTransferSeoAlias(
  {
    [`${pageKey}.seoTitle`]: "New",
    [`${pageKey}.contentTitle`]: "Old",
  },
  pageKey,
)
assert.equal(keepSeo[`${pageKey}.seoTitle`], "New", "existing seo wins")

console.log("transfer-seo-alias.selfcheck: ok")
