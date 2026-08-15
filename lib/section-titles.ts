import type { ContentBlock } from "@/lib/types"
import { getBlockLabel } from "@/lib/table-label"
import { faqBlocksForSlot, isFaqSectionKey } from "@/lib/faq-slots"
import { isMemoSectionKey, memoSettingKeys } from "@/lib/memos-page-cms"

export function buildSectionTitles(
  pageKey: string,
  settings: Record<string, string>,
  resortBlocks: ContentBlock[],
  order: string[],
  faqBlocks: ContentBlock[] = [],
): Record<string, string> {
  const titles: Record<string, string> = {}

  for (const shortKey of order) {
    if (shortKey === "search") {
      const title = settings[`${pageKey}.searchTitle`]?.trim()
      if (title) titles[shortKey] = title
      continue
    }

    if (shortKey === "seo" || /^seo\d+$/.test(shortKey)) {
      const suffix = shortKey === "seo" ? "" : shortKey.replace("seo", "")
      const title = settings[`${pageKey}.seoTitle${suffix}`]?.trim()
      if (title) titles[shortKey] = title
      continue
    }

    if (isFaqSectionKey(shortKey)) {
      const blocks = faqBlocksForSlot(faqBlocks, pageKey, shortKey)
      const fromSubtitle = blocks.map((b) => (b.subtitle || "").trim()).find(Boolean)
      if (fromSubtitle) titles[shortKey] = fromSubtitle
      continue
    }

    if (shortKey === "resorts" || /^resorts\d+$/.test(shortKey)) {
      const suffix = shortKey === "resorts" ? "" : shortKey.replace("resorts", "")
      const overrideTitle = settings[`${pageKey}.resortsTitle${suffix}`]?.trim()
      if (overrideTitle) {
        titles[shortKey] = overrideTitle
        continue
      }
      const tableId = settings[`${pageKey}.section.${shortKey}.tableId`]
      if (!tableId) continue
      const block = resortBlocks.find((item) => String(item.id) === tableId)
      if (block) titles[shortKey] = getBlockLabel(block)
      continue
    }

    if (isMemoSectionKey(shortKey)) {
      const keys = memoSettingKeys(pageKey, shortKey)
      const title = settings[keys.label]?.trim() || settings[keys.heading]?.trim()
      if (title) titles[shortKey] = title
    }
  }

  return titles
}
