import type { ContentBlock } from "@/lib/types"

/** `faq` → pageKey; `faq2` → `pageKey::faq2` (content_blocks.page). */
export function faqStoragePage(pageKey: string, sectionSlot = "faq"): string {
  return sectionSlot === "faq" ? pageKey : `${pageKey}::${sectionSlot}`
}

export function isFaqSectionKey(key: string): boolean {
  return key === "faq" || /^faq\d+$/.test(key)
}

export function faqSlotNumber(shortKey: string): number {
  if (shortKey === "faq") return 1
  const n = parseInt(shortKey.replace(/^faq/, ""), 10)
  return Number.isFinite(n) && n > 0 ? n : 1
}

/** Portal form id for a FAQ section slot — must stay server-callable (not in "use client"). */
export function pageFaqFormId(pageKey: string, sectionSlot = "faq"): string {
  return `page-faq-form-${pageKey.replace(/[^a-z0-9]+/gi, "-")}-${sectionSlot}`
}

/** Form ids for workspace “save all” (faq / faq2 / …). */
export function buildFaqFormIds(pageKey: string, initialOrder: string[], buffer = 3): string[] {
  const maxN = initialOrder
    .filter(isFaqSectionKey)
    .reduce((m, k) => Math.max(m, faqSlotNumber(k)), 1)
  const ids: string[] = []
  for (let n = 1; n <= maxN + buffer; n++) {
    ids.push(pageFaqFormId(pageKey, n === 1 ? "faq" : `faq${n}`))
  }
  return ids
}

/** FAQ blocks for one section slot. */
export function faqBlocksForSlot(
  allFaqs: ContentBlock[],
  pageKey: string,
  sectionSlot: string,
): ContentBlock[] {
  const storage = faqStoragePage(pageKey, sectionSlot)
  return allFaqs.filter((b) => b.page === storage)
}
