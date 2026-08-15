import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Breadcrumb } from "@/components/site/breadcrumb"
import { PublicToursListing } from "@/components/site/public-tours"
import { TitleUnderline } from "@/components/site/title-underline"
import { DESTINATION_DEFAULT_SECTION_ORDER } from "@/lib/section-order"
import { RichContent } from "@/components/site/rich-content"
import { PageAlert } from "@/components/site/alert"
import { ResortCards } from "@/components/site/resort-cards"
import { DestinationSectionMap } from "@/components/site/catalog/destination-section-map"
import { getBusToursWithDates } from "@/lib/queries"
import { getPublicSettings, getFaqs, getFaqBlocksForPage, isOn, getResortBlocksForPage } from "@/lib/cms"
import { getCitiesByCountry } from "@/lib/cities"
import { getCurrencies } from "@/lib/currencies-server"
import { getCountries, getCountrySlugs, visibleCountryNames } from "@/lib/countries"
import { getSlugMaps } from "@/lib/queries"
import { getBusTourTypes } from "@/lib/bus-tour-types"
import { resolvePublicCmsText } from "@/lib/cms-public-text"
import { metadataFromSettings } from "@/lib/seo-metadata"
import { ParsedText } from "@/components/site/parsed-text"

const PAGE_KEY = "bustours"
const DEFAULT_INTRO =
  "Комфортные автобусные путешествия из Минска по России, Беларуси и другим направлениям."

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicSettings()
  return metadataFromSettings(
    settings,
    PAGE_KEY,
    "Автобусные туры — БасТур",
    DEFAULT_INTRO,
    { path: "/avtobusnye-tury/" },
  )
}

export default async function BusToursPage() {
  const settings = await getPublicSettings()
  if (!isOn(settings, "bustours.visible")) notFound()

  const p = PAGE_KEY
  const get = (key: string) => settings[`${p}.${key}`] ?? ""

  const [list, faqBlocksFromPage, legacyFaqs, resortBlocks, citiesByCountry, currencies, countrySlugs, slugMaps, tourTypes, busCountries] =
    await Promise.all([
      getBusToursWithDates(),
      getFaqBlocksForPage(p, { onlyVisible: true }),
      getFaqs("category:bus"),
      getResortBlocksForPage(p, { onlyVisible: true }),
      getCitiesByCountry("bus", settings),
      getCurrencies(),
      getCountrySlugs("bus"),
      getSlugMaps(),
      getBusTourTypes(),
      getCountries("bus"),
    ])

  const visibleCountries = busCountries.filter((c) => settings[`country:bus:${c.slug}.visible`] !== "0")

  // ponytail: keep legacy category:bus FAQs until admin re-saves under bustours
  const faqs = faqBlocksFromPage.length ? faqBlocksFromPage : legacyFaqs

  const sectionOrder = (() => {
    try {
      const raw = settings[`${p}.sections.order`]
      if (raw) return JSON.parse(raw) as string[]
    } catch {}
    return [...DESTINATION_DEFAULT_SECTION_ORDER]
  })()

  const renderCmsSections = (order: string[]) => (
    <DestinationSectionMap
      sectionOrder={order}
      settings={settings}
      settingsPrefix={p}
      resortBlocks={resortBlocks}
      faqs={faqs}
      faqDefaultTitle={settings["title.faq"] || "Частые вопросы"}
      citiesSection={
        visibleCountries.length ? (
          <section className="space-y-4">
            <TitleUnderline as="h2">
              <ParsedText text={get("citiesTitle") || "Популярные направления"} />
            </TitleUnderline>
            <ResortCards
              cities={visibleCountries.map((c) => ({ slug: c.slug, name: c.name }))}
              category="bus"
              cardKind="country"
              settings={settings}
              settingsPrefix="bustours"
              hrefForCity={(country) => `/avtobusnye-tury/${country.slug}/`}
            />
          </section>
        ) : null
      }
    />
  )

  const searchIndex = sectionOrder.indexOf("search")
  const beforeSearchOrder = searchIndex < 0 ? [] : sectionOrder.slice(0, searchIndex)
  const afterSearchOrder = sectionOrder.filter((key, index) => key !== "search" && (searchIndex < 0 || index > searchIndex))

  const h1 = resolvePublicCmsText(get("h1"), "Автобусные туры")
  const introHtml = resolvePublicCmsText(get("intro"), DEFAULT_INTRO, { minLength: 12 })

  const header = (
    <div className="space-y-4">
      <Breadcrumb items={[{ label: "Главная", href: "/" }, { label: "Автобусные туры" }]} />
      <TitleUnderline as="h1">
        <ParsedText text={h1} />
      </TitleUnderline>
      <PageAlert settings={settings} prefix={p} />
      <RichContent html={introHtml} />
    </div>
  )

  return (
    <main className="mx-auto w-full max-w-[1440px] px-4 py-8 md:px-6">
      <PublicToursListing
        category="bus"
        tours={list}
        currencies={currencies}
        tourTypes={tourTypes.map((t) => t.name)}
        citiesByCountry={citiesByCountry}
        cityBasePath="/avtobusnye-tury"
        countrySlugs={countrySlugs}
        countryBasePath="/avtobusnye-tury"
        visibleCountryNames={visibleCountryNames(countrySlugs, settings, "bus")}
        slugMaps={slugMaps}
        beforeSearchContent={renderCmsSections(beforeSearchOrder)}
        header={header}
        seoContent={<div className="space-y-6">{renderCmsSections(afterSearchOrder)}</div>}
        sectionTitle={get("searchTitle") || undefined}
        sectionDescription={get("searchDescription") || undefined}
        defaultSort={get("search.defaultSort") || undefined}
        hideResultsHeading={get("search.hideHeading") || "0"}
      />
    </main>
  )
}
