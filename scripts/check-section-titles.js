const assert = require("node:assert/strict")

function getBlockLabel(block) {
  const extra = block.extra || {}
  if (block.title) return block.title
  if (Array.isArray(extra.columns)) {
    return extra.columns.map(String).slice(0, 2).join(", ") || `Таблица #${block.id}`
  }
  return `Таблица #${block.id}`
}

function buildSectionTitles(pageKey, settings, resortBlocks, order) {
  const titles = {}
  for (const shortKey of order) {
    if (shortKey === "seo" || /^seo\d+$/.test(shortKey)) {
      const suffix = shortKey === "seo" ? "" : shortKey.replace("seo", "")
      const title = settings[`${pageKey}.seoTitle${suffix}`]?.trim()
      if (title) titles[shortKey] = title
    } else if (shortKey === "resorts" || /^resorts\d+$/.test(shortKey)) {
      const tableId = settings[`${pageKey}.section.${shortKey}.tableId`]
      const block = tableId && resortBlocks.find((item) => String(item.id) === tableId)
      if (block) titles[shortKey] = getBlockLabel(block)
    }
  }
  return titles
}

const result = buildSectionTitles(
  "city:avia:test",
  {
    "city:avia:test.seoTitle2": "Второй SEO-блок",
    "city:avia:test.section.resorts.tableId": "7",
  },
  [{ id: 7, title: "Лучшая таблица", extra: {} }],
  ["seo2", "resorts", "seo3", "faq"],
)

assert.equal(result.seo2, "Второй SEO-блок")
assert.equal(result.resorts, "Лучшая таблица")
assert.equal(result.seo3, undefined)
assert.equal(result.faq, undefined)
console.log("section title self-check: ok")
