import { notFound, permanentRedirect } from "next/navigation"
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
import { getCityDestinations, getCityDestination, getCitiesByCountry } from "@/lib/cities"
import { resolveCityPage, assertCityPreviewAccess } from "@/lib/preview-resolve"
import { stripArchivedSuffix } from "@/lib/archive-slug"
import { getCurrencies } from "@/lib/currencies-server"
import { getCountrySlugs, slugify, visibleCountryNames } from "@/lib/countries"
import { getBusTourTypes } from "@/lib/bus-tour-types"
import { metadataFromSettings } from "@/lib/seo-metadata"
import { resolveCmsText } from "@/lib/catalog-cms-content"

export const dynamic = "force-dynamic"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ countrySlug: string; citySlug: string }>
}): Promise<Metadata> {
  const { citySlug } = await params
  const [info, settings, countrySlugs] = await Promise.all([
    getCityDestination(citySlug, "bus"),
    getPublicSettings(),
    getCountrySlugs("bus"),
  ])
  if (!info) return { title: "Автобусные туры — БасТур" }
  const parentCountrySlug = countrySlugs[info.country] ?? (info.country ? slugify(info.country) : citySlug)
  return metadataFromSettings(
    settings,
    `city:bus:${citySlug}`,
    `Автобусные туры в ${info.name} из Минска — БасТур`,
    info.intro.slice(0, 160),
    { path: `/avtobusnye-tury/${parentCountrySlug}/${citySlug}/` },
  )
}

export default async function BusCityPage({
  params,
  searchParams,
}: {
  params: Promise<{ countrySlug: string; citySlug: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const { countrySlug, citySlug } = await params
  const info = await resolveCityPage("bus", citySlug, searchParams)
  if (!info) notFound()
  if (!(await assertCityPreviewAccess(info, searchParams))) notFound()

  const liveCitySlug = stripArchivedSuffix(info.slug)
  const p = `city:bus:${liveCitySlug}`
  const [list, settings, faqs, citiesByCountry, currencies, countrySlugs, slugMaps, tourTypes, resortBlocks] =
    await Promise.all([
      getBusToursWithDates(),
      getPublicSettings(),
      getFaqBlocksForPage(p, { onlyVisible: true }),
      getCitiesByCountry("bus"),
      getCurrencies(),
      getCountrySlugs("bus"),
      getSlugMaps(),
      getBusTourTypes(),
      getResortBlocksForPage(p),
    ])

  if (!info.archived && !isOn(settings, `${p}.visible`)) notFound()

  const parentCountrySlug = countrySlugs[info.country] ?? (info.country ? slugify(info.country) : undefined)
  if (!info.archived) {
    if (parentCountrySlug && !isOn(settings, `country:bus:${parentCountrySlug}.visible`)) notFound()
    if (parentCountrySlug && countrySlug !== parentCountrySlug)
      permanentRedirect(`/avtobusnye-tury/${parentCountrySlug}/${liveCitySlug}/`)
  }

  const relatedCities = (citiesByCountry[info.country] ?? []).filter((c) => c.slug !== liveCitySlug)
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

  const renderCmsSections = (order: string[]) => (
    <DestinationSectionMap
      sectionOrder={order}
      settings={settings}
      settingsPrefix={p}
      resortBlocks={resortBlocks}
      faqs={faqs}
      citiesSection={
        relatedCities.length ? (
          <section className="space-y-4">
            <TitleUnderline as="h2">
              {get("citiesTitle") || `Популярные направления в ${info.country}`}
            </TitleUnderline>
            <ResortCards
              cities={relatedCities}
              basePath={`/avtobusnye-tury/${countrySlug}`}
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
          {
            label: info.country,
            href: countrySlugs[info.country]
              ? `/avtobusnye-tury/${countrySlugs[info.country]}/`
              : undefined,
          },
          { label: info.name },
        ]}
      />
      <TitleUnderline as="h1">
        <ParsedText text={get("h1") || `Автобусные туры в ${info.name} из Минска`} />
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
        initialCountries={[info.country]}
        currencies={currencies}
        tourTypes={tourTypes.map((t) => t.name)}
        citiesByCountry={citiesByCountry}
        activeCitySlug={liveCitySlug}
        cityBasePath={`/avtobusnye-tury/${countrySlug}`}
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
