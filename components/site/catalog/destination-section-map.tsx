import { Fragment, type ReactNode } from "react"
import { TitleUnderline } from "@/components/site/title-underline"
import { RichContent } from "@/components/site/rich-content"
import { ResortComparisonBlocks } from "@/components/site/resort-comparison-blocks"
import { OrderedFaqSection } from "@/components/site/ordered-faq-section"
import { OrderedCallUs } from "@/components/site/ordered-callus"
import { ParsedText } from "@/components/site/parsed-text"
import { isCallusSectionKey } from "@/lib/multipliable-sections"
import { isOn } from "@/lib/cms"
import type { ContentBlock, SiteSettings } from "@/lib/types"

/**
 * Shared sectionOrder renderer for catalog destination pages
 * (aviatory / hot / avtobusnye-tury × home/country/city).
 */
export function DestinationSectionMap({
  sectionOrder,
  settings,
  settingsPrefix,
  searchSection,
  citiesSection,
  resortBlocks,
  faqs,
  faqDefaultTitle,
}: {
  sectionOrder: string[]
  settings: SiteSettings
  settingsPrefix: string
  /** Full search/listing/widget block; omitted/null skips search */
  searchSection?: ReactNode
  /** Full cities block (`<section>…`); omitted/null skips cities */
  citiesSection?: ReactNode
  resortBlocks: ContentBlock[]
  faqs: ContentBlock[]
  faqDefaultTitle?: string
}) {
  const p = settingsPrefix
  const order = sectionOrder

  return (
    <>
      {order.map((key) => {
        if (key === "search") {
          if (!searchSection || !isOn(settings, `${p}.section.search`)) return null
          return <Fragment key="search">{searchSection}</Fragment>
        }

        if (key === "cities") {
          if (!citiesSection || !isOn(settings, `${p}.section.cities`)) return null
          return <Fragment key="cities">{citiesSection}</Fragment>
        }

        if (key === "resorts" || /^resorts\d+$/.test(key)) {
          if (!resortBlocks.length || !isOn(settings, `${p}.section.${key}`)) return null
          const tableId = settings[`${p}.section.${key}.tableId`]
          const blocks = tableId
            ? resortBlocks.filter((b) => String(b.id) === tableId)
            : resortBlocks
          if (!blocks.length) return null
          return <ResortComparisonBlocks key={key} blocks={blocks} />
        }

        if (key === "seo" || /^seo\d+$/.test(key)) {
          const suffix = key === "seo" ? "" : key.replace("seo", "")
          const title = settings[`${p}.seoTitle${suffix}`] ?? ""
          const html = settings[`${p}.seoHtml${suffix}`] ?? ""
          // Title-only SEO still renders (e2e shortcodes seed seoTitle without html)
          if ((!html && !title) || !isOn(settings, `${p}.section.${key}`)) return null
          return (
            <section key={key} className="space-y-4">
              {title ? (
                <TitleUnderline as="h2">
                  <ParsedText text={title} />
                </TitleUnderline>
              ) : null}
              {html ? <RichContent html={html} /> : null}
            </section>
          )
        }

        if (key === "faq" || /^faq\d+$/.test(key)) {
          return (
            <OrderedFaqSection
              key={key}
              sectionKey={key}
              pageKey={p}
              settings={settings}
              allFaqs={faqs}
              defaultTitle={faqDefaultTitle}
            />
          )
        }

        if (isCallusSectionKey(key)) {
          return (
            <OrderedCallUs
              key={key}
              sectionKey={key}
              settingsPrefix={p}
              settings={settings}
            />
          )
        }

        return null
      })}
    </>
  )
}
