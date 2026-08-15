import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { Breadcrumb } from "@/components/site/breadcrumb"
import { HotToursWidget } from "@/components/site/hot-tours-widget"
import { AviaTourSearchWidget } from "@/components/site/avia-tour-search-widget"
import { TitleUnderline } from "@/components/site/title-underline"
import { DESTINATION_DEFAULT_SECTION_ORDER } from "@/lib/section-order"
import { RichContent } from "@/components/site/rich-content"
import { PageAlert } from "@/components/site/alert"
import { HotSidebar } from "@/components/site/hot-sidebar"
import { ResortCards } from "@/components/site/resort-cards"
import { DestinationSectionMap } from "@/components/site/catalog/destination-section-map"
import { getPublicSettings, getFaqBlocksForPage, isOn, getResortBlocksForPage } from "@/lib/cms"
import { getCountry, getCountries } from "@/lib/countries"
import { getCitiesByCountry } from "@/lib/cities"
import { getHotSidebarData } from "@/lib/hot-destinations"
import { metadataFromSettings } from "@/lib/seo-metadata"
import { resolveCmsText } from "@/lib/catalog-cms-content"
import { resolveCountryPage, assertCountryPreviewAccess } from "@/lib/preview-resolve"
import { stripArchivedSuffix } from "@/lib/archive-slug"
import { ParsedText } from "@/components/site/parsed-text"
import { getShortcodesDict } from "@/lib/shortcodes"

interface Props {
  params: Promise<{ countrySlug: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export const dynamic = "force-dynamic"

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { countrySlug } = await params
  const settings = await getPublicSettings()
  const country = await getCountry(countrySlug, "hot")
  if (!country) return { title: "Горящие туры — БасТур" }

  const p = `country:hot:${country.slug}`
  return metadataFromSettings(
    settings,
    p,
    `Горящие туры в ${country.name} — БасТур`,
    country.intro.slice(0, 160) || `Горящие туры в ${country.name} по специальным ценам`,
    { path: `/hot/${countrySlug}/` },
  )
}

export default async function HotCountryPage({ params, searchParams }: Props) {
  const { countrySlug } = await params
  const country = await resolveCountryPage("hot", countrySlug, searchParams)
  if (!country) notFound()
  if (!(await assertCountryPreviewAccess(country, searchParams))) notFound()

  const settings = await getPublicSettings()
  const liveCountrySlug = stripArchivedSuffix(country.slug)
  if (!country.archived && !isOn(settings, "hot.visible")) notFound()
  if (!country.archived && !isOn(settings, `country:hot:${liveCountrySlug}.visible`)) notFound()

  const p = `country:hot:${liveCountrySlug}`

  const [faqs, resortBlocks, sidebarData, citiesByCountry, shortcodesDict] = await Promise.all([
    getFaqBlocksForPage(p, { onlyVisible: true }),
    getResortBlocksForPage(p, { onlyVisible: true }),
    getHotSidebarData(settings),
    getCitiesByCountry("hot", settings),
    getShortcodesDict(),
  ])

  const get = (key: string) => settings[`${p}.${key}`] ?? ""
  const useAviaWidget = settings["hot.widget"] === "avia"
  const countryCities = (citiesByCountry[country.name] ?? []).filter(
    (c) => settings[`city:hot:${c.slug}.visible`] !== "0",
  )

  const sectionOrder = (() => {
    try {
      const raw = settings[`${p}.sections.order`]
      if (raw) return JSON.parse(raw) as string[]
    } catch {}
    return [...DESTINATION_DEFAULT_SECTION_ORDER]
  })()

  return (
    <main className="mx-auto w-full max-w-[1440px] px-4 py-8 md:px-6">
      <div className="flex flex-col gap-6 md:flex-row md:items-start">
        <HotSidebar
          countryNames={sidebarData.countryNames}
          citiesByCountry={sidebarData.citiesByCountry}
          countrySlugs={sidebarData.countrySlugs}
          activeCountrySlug={liveCountrySlug}
          shortcodesDict={shortcodesDict}
        />

        <div className="min-w-0 flex-1">
          <Breadcrumb
            items={[
              { label: "Главная", href: "/" },
              { label: "Горящие туры", href: "/hot/" },
              { label: country.name },
            ]}
          />
          <div className="space-y-8">
            <div className="space-y-4">
            <TitleUnderline as="h1">
              <ParsedText text={get("h1") || `Горящие туры в ${country.name}`} />
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
                countryCities.length ? (
                  <section className="space-y-4">
                    <TitleUnderline as="h2">
                      {get("citiesTitle") || `Популярные курорты в ${country.name}`}
                    </TitleUnderline>
                    <ResortCards cities={countryCities} basePath={`/hot/${liveCountrySlug}`} category="hot" settings={settings} settingsPrefix={p} />
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
