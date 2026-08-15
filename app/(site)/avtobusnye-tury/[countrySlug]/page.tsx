import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { Breadcrumb } from "@/components/site/breadcrumb"
import { PublicToursListing } from "@/components/site/public-tours"
import { TitleUnderline } from "@/components/site/title-underline"
import { DESTINATION_DEFAULT_SECTION_ORDER } from "@/lib/section-order"
import { RichContent } from "@/components/site/rich-content"
import { PageAlert } from "@/components/site/alert"
import { ResortCards } from "@/components/site/resort-cards"
import { DestinationSectionMap } from "@/components/site/catalog/destination-section-map"
import { ParsedText } from "@/components/site/parsed-text"
import { getBusToursWithDates, getSlugMaps } from "@/lib/queries"
import { getPublicSettings, getFaqBlocksForPage, isOn, getResortBlocksForPage } from "@/lib/cms"
import { getCitiesByCountry, getCityDestinations } from "@/lib/cities"
import { getCurrencies } from "@/lib/currencies-server"
import { getCountry, getCountries, getCountrySlugs, visibleCountryNames } from "@/lib/countries"
import { getBusTourTypes } from "@/lib/bus-tour-types"
import { metadataFromSettings } from "@/lib/seo-metadata"
import { resolveCmsText } from "@/lib/catalog-cms-content"
import { resolveCountryPage, assertCountryPreviewAccess } from "@/lib/preview-resolve"
import { stripArchivedSuffix } from "@/lib/archive-slug"

export const dynamic = "force-dynamic"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ countrySlug: string }>
}): Promise<Metadata> {
  const { countrySlug } = await params
  const [country, settings] = await Promise.all([getCountry(countrySlug, "bus"), getPublicSettings()])
  if (!country) return { title: "Автобусные туры — БасТур" }
  return metadataFromSettings(
    settings,
    `country:bus:${countrySlug}`,
    `Автобусные туры в ${country.name} — БасТур`,
    country.intro.slice(0, 160) || `Автобусные туры в ${country.name} из Минска от турагентства БасТур`,
    { path: `/avtobusnye-tury/${countrySlug}/` },
  )
}

export default async function BusCountryPage({
  params,
  searchParams,
}: {
  params: Promise<{ countrySlug: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const { countrySlug } = await params
  const country = await resolveCountryPage("bus", countrySlug, searchParams)
  if (!country) notFound()
  if (!(await assertCountryPreviewAccess(country, searchParams))) notFound()

  const liveCountrySlug = stripArchivedSuffix(country.slug)
  const p = `country:bus:${liveCountrySlug}`
  const [list, settings, faqs, citiesByCountry, currencies, countrySlugs, allCities, slugMaps, tourTypes, resortBlocks] =
    await Promise.all([
      getBusToursWithDates(),
      getPublicSettings(),
      getFaqBlocksForPage(p, { onlyVisible: true }),
      getCitiesByCountry("bus"),
      getCurrencies(),
      getCountrySlugs("bus"),
      getCityDestinations("bus"),
      getSlugMaps(),
      getBusTourTypes(),
      getResortBlocksForPage(p),
    ])

  if (!country.archived && !isOn(settings, `${p}.visible`)) notFound()

  const get = (key: string) => settings[`${p}.${key}`] ?? ""
  const sectionOrder = (() => {
    try {
      const raw = settings[`${p}.sections.order`]
      if (raw) return JSON.parse(raw) as string[]
    } catch {}
    return [...DESTINATION_DEFAULT_SECTION_ORDER]
  })()

  const searchIndex = sectionOrder.indexOf("search")
  const beforeSearchOrder = searchIndex < 0 ? [] : sectionOrder.slice(0, searchIndex)
  const afterSearchOrder = sectionOrder.filter((key, index) => key !== "search" && (searchIndex < 0 || index > searchIndex))

  const countryCities = allCities.filter(
    (c) => c.country === country.name && settings[`city:bus:${c.slug}.visible`] !== "0",
  )

  const renderCmsSections = (order: string[]) => (
    <DestinationSectionMap
      sectionOrder={order}
      settings={settings}
      settingsPrefix={p}
      resortBlocks={resortBlocks}
      faqs={faqs}
      citiesSection={
        countryCities.length ? (
          <section className="space-y-4">
            <TitleUnderline as="h2">
              {get("citiesTitle") || `Города в ${country.name}`}
            </TitleUnderline>
            <ResortCards
              cities={countryCities}
              basePath={`/avtobusnye-tury/${liveCountrySlug}`}
              category="bus"
              settings={settings}
              settingsPrefix={p}
            />
          </section>
        ) : null
      }
    />
  )

  const header = (
    <div className="space-y-4">
      <Breadcrumb
        items={[
          { label: "Главная", href: "/" },
          { label: "Автобусные туры", href: "/avtobusnye-tury/" },
          { label: country.name },
        ]}
      />
      <TitleUnderline as="h1">
        <ParsedText text={get("h1") || `Автобусные туры в ${country.name}`} />
      </TitleUnderline>
      <PageAlert settings={settings} prefix={p} />
      {resolveCmsText(get("intro")) ? (
        <RichContent html={resolveCmsText(get("intro"))} />
      ) : null}
    </div>
  )

  return (
    <main className="mx-auto w-full max-w-[1440px] px-4 py-8 md:px-6">
      <PublicToursListing
        category="bus"
        tours={list}
        initialCountries={[country.name]}
        currencies={currencies}
        tourTypes={tourTypes.map((t) => t.name)}
        citiesByCountry={citiesByCountry}
        cityBasePath={`/avtobusnye-tury/${liveCountrySlug}`}
        countrySlugs={countrySlugs}
        countryBasePath="/avtobusnye-tury"
        visibleCountryNames={visibleCountryNames(countrySlugs, settings, "bus")}
        slugMaps={slugMaps}
        header={header}
        beforeSearchContent={renderCmsSections(beforeSearchOrder)}
        seoContent={<div className="space-y-6">{renderCmsSections(afterSearchOrder)}</div>}
        sectionTitle={get("searchTitle") || undefined}
        sectionDescription={get("searchDescription") || undefined}
        defaultSort={get("search.defaultSort") || undefined}
        hideResultsHeading={get("search.hideHeading") || "0"}
      />
    </main>
  )
}
