import { notFound, permanentRedirect } from "next/navigation"
import type { Metadata } from "next"
import { Breadcrumb } from "@/components/site/breadcrumb"
import { HotToursWidget } from "@/components/site/hot-tours-widget"
import { AviaTourSearchWidget } from "@/components/site/avia-tour-search-widget"
import { TitleUnderline } from "@/components/site/title-underline"
import { DESTINATION_DEFAULT_SECTION_ORDER } from "@/lib/section-order"
import { RichContent } from "@/components/site/rich-content"
import { PageAlert } from "@/components/site/alert"
import { ResortCards } from "@/components/site/resort-cards"
import { HotSidebar } from "@/components/site/hot-sidebar"
import { DestinationSectionMap } from "@/components/site/catalog/destination-section-map"
import { getPublicSettings, getFaqBlocksForPage, isOn, getResortBlocksForPage } from "@/lib/cms"
import { getCountry, getCountrySlugs, slugify } from "@/lib/countries"
import { getCityDestination, getCitiesByCountry, getCityDestinations } from "@/lib/cities"
import { getHotSidebarData } from "@/lib/hot-destinations"
import { metadataFromSettings } from "@/lib/seo-metadata"
import { resolveCmsText } from "@/lib/catalog-cms-content"
import { resolveCityPage, assertCityPreviewAccess } from "@/lib/preview-resolve"
import { stripArchivedSuffix } from "@/lib/archive-slug"
import { ParsedText } from "@/components/site/parsed-text"
import { getShortcodesDict } from "@/lib/shortcodes"

interface Props {
  params: Promise<{ countrySlug: string; citySlug: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export const dynamic = "force-dynamic"

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { citySlug } = await params
  const [info, settings, countrySlugs] = await Promise.all([
    getCityDestination(citySlug, "hot"),
    getPublicSettings(),
    getCountrySlugs("hot"),
  ])
  if (!info) return { title: "Горящие туры — БасТур" }
  const p = `city:hot:${citySlug}`
  const parentCountrySlug = countrySlugs[info.country] ?? (info.country ? slugify(info.country) : citySlug)
  return metadataFromSettings(
    settings,
    p,
    `Горящие туры — ${info.name} — БасТур`,
    info.intro.slice(0, 160) || `Горящие туры ${info.name} по специальным ценам`,
    { path: `/hot/${parentCountrySlug}/${citySlug}/` },
  )
}

export default async function HotCityPage({ params, searchParams }: Props) {
  const { countrySlug, citySlug } = await params
  const info = await resolveCityPage("hot", citySlug, searchParams)
  if (!info) notFound()
  if (!(await assertCityPreviewAccess(info, searchParams))) notFound()

  const settings = await getPublicSettings()
  const [sidebarData, citiesByCountry, countrySlugs, shortcodesDict] = await Promise.all([
    getHotSidebarData(settings),
    getCitiesByCountry("hot", settings),
    getCountrySlugs("hot"),
    getShortcodesDict(),
  ])

  if (!info.archived && !isOn(settings, "hot.visible")) notFound()

  const liveCitySlug = stripArchivedSuffix(info.slug)
  const p = `city:hot:${liveCitySlug}`
  // Fall back to a slugified country name when the country row was deleted.
  const parentCountrySlug = countrySlugs[info.country] ?? (info.country ? slugify(info.country) : undefined)
  // Canonical URL is /hot/{parent-country}/{city}/ — redirect placeholder ("_") or wrong-country URLs.
  if (!info.archived) {
    if (parentCountrySlug && countrySlug !== parentCountrySlug)
      permanentRedirect(`/hot/${parentCountrySlug}/${liveCitySlug}/`)
    if (parentCountrySlug && !isOn(settings, `country:hot:${parentCountrySlug}.visible`)) notFound()
    if (!isOn(settings, `${p}.visible`)) notFound()
  }

  const [faqs, resortBlocks] = await Promise.all([
    getFaqBlocksForPage(p, { onlyVisible: true }),
    getResortBlocksForPage(p, { onlyVisible: true }),
  ])

  const get = (key: string) => settings[`${p}.${key}`] ?? ""
  const useAviaWidget = settings["hot.widget"] === "avia"

  const sectionOrder = (() => {
    try {
      const raw = settings[`${p}.sections.order`]
      if (raw) return JSON.parse(raw) as string[]
    } catch {}
    return [...DESTINATION_DEFAULT_SECTION_ORDER]
  })()

  const relatedCities = (citiesByCountry[info.country] ?? []).filter((c) => c.slug !== liveCitySlug && (!settings || settings[`city:hot:${c.slug}.visible`] !== "0"))
  const country = await getCountry(countrySlug === "_" ? (parentCountrySlug ?? "_") : countrySlug, "hot")
  const resolvedCountrySlug = parentCountrySlug ?? countrySlug

  return (
    <main className="mx-auto w-full max-w-[1440px] px-4 py-8 md:px-6">
      <div className="flex flex-col gap-6 md:flex-row md:items-start">
        <HotSidebar
          countryNames={sidebarData.countryNames}
          citiesByCountry={sidebarData.citiesByCountry}
          countrySlugs={sidebarData.countrySlugs}
          activeCountrySlug={resolvedCountrySlug}
          activeCitySlug={liveCitySlug}
          shortcodesDict={shortcodesDict}
        />

        <div className="min-w-0 flex-1">
          <Breadcrumb
            items={[
              { label: "Главная", href: "/" },
              { label: "Горящие туры", href: "/hot/" },
              ...(country ? [{ label: country.name, href: `/hot/${resolvedCountrySlug}/` }] : []),
              { label: info.name },
            ]}
          />
          <div className="space-y-8">
            <div className="space-y-4">
            <TitleUnderline as="h1">
              <ParsedText text={get("h1") || `Горящие туры — ${info.name}`} />
            </TitleUnderline>
            <PageAlert settings={settings} prefix={p} />
            {resolveCmsText(get("intro")) ? (
              <RichContent html={resolveCmsText(get("intro"))} />
            ) : null}
            </div>

          {useAviaWidget ? <AviaTourSearchWidget /> : <HotToursWidget />}

            <DestinationSectionMap
              sectionOrder={sectionOrder}
              settings={settings}
              settingsPrefix={p}
              resortBlocks={resortBlocks}
              faqs={faqs}
              citiesSection={
                relatedCities.length ? (
                  <section className="space-y-4">
                    <TitleUnderline as="h2">
                      {get("citiesTitle") || `Популярные курорты в ${info.country}`}
                    </TitleUnderline>
                    <ResortCards cities={relatedCities} basePath={`/hot/${resolvedCountrySlug}`} category="hot" settings={settings} settingsPrefix={p} />
                  </section>
                ) : null
              }
            />
          </div>
        </div>
      </div>
    </main>
  )
}
