import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Breadcrumb } from "@/components/site/breadcrumb"
import { AviaTourSearchWidget } from "@/components/site/avia-tour-search-widget"
import { AviaSidebar } from "@/components/site/avia-sidebar"
import { TitleUnderline } from "@/components/site/title-underline"
import { PageAlert } from "@/components/site/alert"
import { DESTINATION_DEFAULT_SECTION_ORDER } from "@/lib/section-order"
import { RichContent } from "@/components/site/rich-content"
import { ResortCards } from "@/components/site/resort-cards"
import { DestinationSectionMap } from "@/components/site/catalog/destination-section-map"
import { getPublicSettings, getFaqBlocksForPage, getFaqs, isOn, getResortBlocksForPage } from "@/lib/cms"
import { getAviaCountries } from "@/lib/countries"
import { resolvePublicCmsText } from "@/lib/cms-public-text"
import { metadataFromSettings } from "@/lib/seo-metadata"
import { resolveAviaSlug } from "@/lib/avia-slug"
import { ParsedText } from "@/components/site/parsed-text"
import { getShortcodesDict } from "@/lib/shortcodes"

const PAGE_KEY = "aviatory"

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicSettings()
  const aviaPrefix = `/${resolveAviaSlug(settings["aviatory.slug"])}`
  return metadataFromSettings(
    settings,
    PAGE_KEY,
    "Авиатуры — БасТур",
    "Пляжный отдых и экскурсионные авиатуры от всех туроператоров. Бронирование из Минска.",
    { path: `${aviaPrefix}/` },
  )
}

export default async function AviaToursPage() {
  const settings = await getPublicSettings()
  if (!isOn(settings, "aviatory.visible")) notFound()

  const p = PAGE_KEY
  const get = (key: string) => settings[`${p}.${key}`] ?? ""
  const defaultIntro =
    "Пляжный отдых и экскурсионные авиатуры от всех туроператоров. Бронирование из Минска."
  const h1 = resolvePublicCmsText(get("h1"), "Авиатуры")
  const introHtml = resolvePublicCmsText(get("intro"), defaultIntro, { minLength: 12 })
  const aviaPrefix = `/${resolveAviaSlug(settings["aviatory.slug"])}`

  const [faqBlocksFromPage, legacyFaqs, resortBlocks, aviaCountries, shortcodesDict] = await Promise.all([
    getFaqBlocksForPage(p, { onlyVisible: true }),
    getFaqs("category:avia"),
    getResortBlocksForPage(p, { onlyVisible: true }),
    getAviaCountries(settings),
    getShortcodesDict(),
  ])

  // ponytail: keep legacy category:avia until admin re-saves under aviatory
  const faqs = faqBlocksFromPage.length ? faqBlocksFromPage : legacyFaqs

  const sectionOrder = (() => {
    try {
      const raw = settings[`${p}.sections.order`]
      if (raw) return JSON.parse(raw) as string[]
    } catch {
      /* ignore */
    }
    return [...DESTINATION_DEFAULT_SECTION_ORDER]
  })()

  const searchIndex = sectionOrder.indexOf("search")
  const beforeSearchOrder = searchIndex < 0 ? [] : sectionOrder.slice(0, searchIndex)
  const afterSearchOrder = sectionOrder.filter((key, index) => key !== "search" && (searchIndex < 0 || index > searchIndex))

  const renderCmsSections = (order: string[]) => (
    <DestinationSectionMap
      sectionOrder={order}
      settings={settings}
      settingsPrefix={p}
      resortBlocks={resortBlocks}
      faqs={faqs}
      faqDefaultTitle={settings["title.faq"] || "Частые вопросы"}
      citiesSection={
        aviaCountries.length ? (
          <section className="space-y-4">
            <TitleUnderline as="h2">
              <ParsedText text={get("citiesTitle") || "Популярные направления"} />
            </TitleUnderline>
            <ResortCards
              cities={aviaCountries.map((c) => ({ slug: c.slug, name: c.name }))}
              category="avia"
              cardKind="country"
              settings={settings}
              settingsPrefix="aviatory"
              hrefForCity={(country) => `${aviaPrefix}/${country.slug}/`}
            />
          </section>
        ) : null
      }
    />
  )

  return (
    <main className="mx-auto w-full max-w-[1440px] px-4 py-8 md:px-6">
      <div className="flex flex-col gap-6 md:flex-row md:items-start">
        <AviaSidebar countries={aviaCountries} shortcodesDict={shortcodesDict} />
        <div className="min-w-0 flex-1 space-y-8">
          <div className="space-y-6">
            <Breadcrumb items={[{ label: "Главная", href: "/" }, { label: "Авиатуры" }]} />
            <div className="space-y-4">
              <TitleUnderline as="h1">
                <ParsedText text={h1} />
              </TitleUnderline>
              <PageAlert settings={settings} prefix={p} />
              <RichContent html={introHtml} />
            </div>
            {renderCmsSections(beforeSearchOrder)}
            <AviaTourSearchWidget />
            {renderCmsSections(afterSearchOrder)}
          </div>
        </div>
      </div>
    </main>
  )
}
