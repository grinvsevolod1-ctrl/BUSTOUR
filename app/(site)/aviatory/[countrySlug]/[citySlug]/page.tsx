import { notFound, permanentRedirect } from "next/navigation"
import type { Metadata } from "next"
import { Breadcrumb } from "@/components/site/breadcrumb"
import { AviaTourSearchWidget } from "@/components/site/avia-tour-search-widget"
import { AviaSidebar } from "@/components/site/avia-sidebar"
import { TitleUnderline } from "@/components/site/title-underline"
import { DESTINATION_DEFAULT_SECTION_ORDER } from "@/lib/section-order"
import { RichContent } from "@/components/site/rich-content"
import { PageAlert } from "@/components/site/alert"
import { ResortCards } from "@/components/site/resort-cards"
import { DestinationSectionMap } from "@/components/site/catalog/destination-section-map"
import { getPublicSettings, getFaqBlocksForPage, isOn, getResortBlocksForPage } from "@/lib/cms"
import { getCityDestinations, getCityDestination, getCitiesByCountry } from "@/lib/cities"
import { getCountrySlugs, slugify, getAviaCountries } from "@/lib/countries"
import { metadataFromSettings } from "@/lib/seo-metadata"
import { resolveCmsText } from "@/lib/catalog-cms-content"
import { resolveAviaSlug } from "@/lib/avia-slug"
import { resolveCityPage, assertCityPreviewAccess } from "@/lib/preview-resolve"
import { stripArchivedSuffix } from "@/lib/archive-slug"
import { ParsedText } from "@/components/site/parsed-text"
import { getShortcodesDict } from "@/lib/shortcodes"

export const dynamic = "force-dynamic"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ countrySlug: string; citySlug: string }>
}): Promise<Metadata> {
  const { countrySlug, citySlug } = await params
  const [info, settings] = await Promise.all([getCityDestination(citySlug, "avia"), getPublicSettings()])
  if (!info) return { title: "Авиатуры — БасТур" }
  const p = `city:avia:${citySlug}`
  const aviaPrefix = `/${resolveAviaSlug(settings["aviatory.slug"])}`
  const country = countrySlug === "_" ? "_" : countrySlug
  return metadataFromSettings(
    settings,
    p,
    `Авиатуры в ${info.name} — БасТур`,
    info.intro.slice(0, 160),
    { path: `${aviaPrefix}/${country}/${citySlug}/` },
  )
}

export default async function AviaCityPage({
  params,
  searchParams,
}: {
  params: Promise<{ countrySlug: string; citySlug: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const { countrySlug, citySlug } = await params
  const info = await resolveCityPage("avia", citySlug, searchParams)
  if (!info) notFound()
  if (!(await assertCityPreviewAccess(info, searchParams))) notFound()

  const settings = await getPublicSettings()
  const liveCitySlug = stripArchivedSuffix(info.slug)
  const p = `city:avia:${liveCitySlug}`
  const [faqs, citiesByCountry, countrySlugs, aviaCountries, resortBlocks, shortcodesDict] = await Promise.all([
    getFaqBlocksForPage(p, { onlyVisible: true }),
    getCitiesByCountry("avia", settings),
    getCountrySlugs("avia"),
    getAviaCountries(settings),
    getResortBlocksForPage(p),
    getShortcodesDict(),
  ])

  // 404 if avia home, parent country, or this city is hidden
  if (!info.archived && !isOn(settings, "aviatory.visible")) notFound()
  // country slug for this city is stored in countrySlugs map (name → slug)
  // Fall back to a slugified country name when the country row was deleted.
  const parentCountrySlug = countrySlugs[info.country] ?? (info.country ? slugify(info.country) : undefined)
  // Canonical URL is /{aviaPrefix}/{parent-country}/{city}/ — redirect placeholder ("_") or wrong-country URLs.
  if (!info.archived) {
    if (parentCountrySlug && countrySlug !== parentCountrySlug)
      permanentRedirect(`/${resolveAviaSlug(settings["aviatory.slug"])}/${parentCountrySlug}/${liveCitySlug}/`)
    if (parentCountrySlug && !isOn(settings, `country:avia:${parentCountrySlug}.visible`)) notFound()
    if (!isOn(settings, `${p}.visible`)) notFound()
  }

  const aviaPrefix = `/${resolveAviaSlug(settings["aviatory.slug"])}`
  const relatedCities = (citiesByCountry[info.country] ?? []).filter((c) => c.slug !== liveCitySlug)
  const sectionOrder = (() => {
    try {
      const raw = settings[`${p}.sections.order`]
      if (raw) return JSON.parse(raw) as string[]
    } catch {}
    return [...DESTINATION_DEFAULT_SECTION_ORDER]
  })()
  const get = (key: string) => settings[`${p}.${key}`] ?? ""

  const header = (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Главная", href: "/" },
          { label: "Авиатуры", href: `${aviaPrefix}/` },
          {
            label: info.country,
            href: countrySlugs[info.country]
              ? `${aviaPrefix}/${countrySlugs[info.country]}/`
              : undefined,
          },
          { label: info.name },
        ]}
      />
      <div className="space-y-4">
        <TitleUnderline as="h1"><ParsedText text={get("h1") || `Авиатуры в ${info.name}`} /></TitleUnderline>
        <PageAlert settings={settings} prefix={p} />
        {resolveCmsText(get("intro")) ? (
          <RichContent html={resolveCmsText(get("intro"))} />
        ) : null}
      </div>
      <AviaTourSearchWidget />
    </div>
  )

  return (
    <main className="mx-auto w-full max-w-[1440px] px-4 py-8 md:px-6">
      <div className="flex flex-col gap-6 md:flex-row md:items-start">
        <AviaSidebar
          countries={aviaCountries}
          activeCountrySlug={countrySlug}
          activeCitySlug={liveCitySlug}
          shortcodesDict={shortcodesDict}
        />
        <div className="min-w-0 flex-1 space-y-6">
          {header}
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
                    <ParsedText text={get("citiesTitle") || `Популярные курорты в ${info.country}`} />
                  </TitleUnderline>
                  <ResortCards
                    cities={relatedCities}
                    basePath={`${aviaPrefix}/${countrySlug}`}
                    category="avia"
                    settings={settings}
                    settingsPrefix={p}
                  />
                </section>
              ) : null
            }
          />
        </div>
      </div>
    </main>
  )
}
