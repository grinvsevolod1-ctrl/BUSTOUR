import { Faq } from "@/components/site/faq"
import { FaqJsonLd } from "@/components/site/faq-json-ld"
import { isOn } from "@/lib/cms"
import { expandContentBlocks, expandPlainText } from "@/lib/expand-content-blocks"
import { groupFaqBlocks } from "@/lib/faq-form"
import { faqBlocksForSlot, isFaqSectionKey } from "@/lib/faq-slots"
import type { ContentBlock, SiteSettings } from "@/lib/types"

/** Async RSC for one FAQ slot — use as JSX, do not `await` inside `.map` without Promise.all. */
export async function OrderedFaqSection({
  sectionKey,
  pageKey,
  settings,
  allFaqs,
  defaultTitle = "Частые вопросы",
}: {
  sectionKey: string
  pageKey: string
  settings: SiteSettings
  allFaqs: ContentBlock[]
  defaultTitle?: string
}) {
  if (!isFaqSectionKey(sectionKey)) return null
  const visKey = pageKey === "home" ? `section.${sectionKey}` : `${pageKey}.section.${sectionKey}`
  if (!isOn(settings, visKey)) return null
  const blocks = await expandContentBlocks(faqBlocksForSlot(allFaqs, pageKey, sectionKey))
  if (!blocks.length) return null
  const groups = groupFaqBlocks(blocks, defaultTitle)
  const schemaItems = groups.flatMap((g) =>
    g.items.map((item) => ({ question: item.title, answer: item.body })),
  )
  const titles = await Promise.all(groups.map((g) => expandPlainText(g.title)))

  return (
    <section className="mx-auto w-full max-w-[1440px] space-y-6 px-4 py-6 md:px-6">
      <FaqJsonLd items={schemaItems} />
      {groups.map((g, i) => (
        <Faq key={`${sectionKey}-${i}`} items={g.items} title={titles[i] ?? g.title} bare />
      ))}
    </section>
  )
}

/** @deprecated Prefer `<OrderedFaqSection />` as a child RSC. */
export async function renderOrderedFaqSection(
  key: string,
  pageKey: string,
  settings: SiteSettings,
  allFaqs: ContentBlock[],
  defaultTitle = "Частые вопросы",
): Promise<React.ReactNode> {
  return (
    <OrderedFaqSection
      key={key}
      sectionKey={key}
      pageKey={pageKey}
      settings={settings}
      allFaqs={allFaqs}
      defaultTitle={defaultTitle}
    />
  )
}
