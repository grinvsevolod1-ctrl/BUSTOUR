import { PageFaqForm } from "@/components/admin/page-faq-form"
import { faqSlotNumber, faqStoragePage, isFaqSectionKey } from "@/lib/faq-slots"
import type { ContentBlock } from "@/lib/types"

/** Pre-render faq / faq2 / … slots for PageSectionsManager (like SEO / resorts). */
export function buildFaqSlots(
  pageKey: string,
  initialOrder: string[],
  allFaqBlocks: ContentBlock[],
  buffer = 3,
): Record<string, React.ReactNode> {
  const maxN = initialOrder
    .filter(isFaqSectionKey)
    .reduce((m, k) => Math.max(m, faqSlotNumber(k)), 1)

  const slots: Record<string, React.ReactNode> = {}
  for (let n = 1; n <= maxN + buffer; n++) {
    const shortKey = n === 1 ? "faq" : `faq${n}`
    const storage = faqStoragePage(pageKey, shortKey)
    const faqs = allFaqBlocks.filter((b) => b.page === storage)
    slots[shortKey] = <PageFaqForm pageKey={pageKey} sectionSlot={shortKey} faqs={faqs} />
  }
  return slots
}
