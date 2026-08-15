import type { Metadata } from "next"
import { notFound } from "next/navigation"
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
import { getCountries } from "@/lib/countries"
import { getHotSidebarData } from "@/lib/hot-destinations"
import { resolvePublicCmsText } from "@/lib/cms-public-text"
import { metadataFromSettings } from "@/lib/seo-metadata"
import { ParsedText } from "@/components/site/parsed-text"
import { getShortcodesDict } from "@/lib/shortcodes"

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicSettings()
  return metadataFromSettings(settings, "hot", "Горящие туры — БасТур", "Успейте забронировать горящие туры по специальным ценам с ближайшим вылетом.", { path: "/hot/" })
}

export default async function HotToursPage() {
  const settings = await getPublicSettings()
  if (!isOn(settings, "hot.visible")) notFound()

  const p = "hot"

  const [faqs, resortBlocks, sidebarData, hotCountries, shortcodesDict] = await Promise.all([
    getFaqBlocksForPage(p, { onlyVisible: true }),
    getResortBlocksForPage(p, { onlyVisible: true }),
    getHotSidebarData(settings),
    getCountries("hot"),
    getShortcodesDict(),
  ])

  const visibleCountries = hotCountries.filter((c) => settings[`country:hot:${c.slug}.visible`] !== "0")

  // Widget: "avia" = AviaTourSearchWidget, anything else = HotToursWidget (default)
  const useAviaWidget = settings["hot.widget"] === "avia"

  const get = (key: string) => settings[`${p}.${key}`] ?? ""

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
        {sidebarData.countryNames.length > 0 && (
          <HotSidebar
            countryNames={sidebarData.countryNames}
            citiesByCountry={sidebarData.citiesByCountry}
            countrySlugs={sidebarData.countrySlugs}
            shortcodesDict={shortcodesDict}
          />
        )}

        <div className="min-w-0 flex-1">
          <Breadcrumb items={[{ label: "Главная", href: "/" }, { label: "Горящие туры" }]} />
          <div className="space-y-8">
            <div className="space-y-4">
            <TitleUnderline as="h1">
              <ParsedText text={resolvePublicCmsText(get("h1"), "Горящие туры")} />
            </TitleUnderline>
            <PageAlert settings={settings} prefix={p} />
            <RichContent
              html={resolvePublicCmsText(
                get("intro"),
                "Успейте забронировать горящие туры по специальным ценам с ближайшим вылетом.",
                { minLength: 12 },
              )}
            />
            </div>

            {useAviaWidget ? <AviaTourSearchWidget /> : <HotToursWidget />}

            <DestinationSectionMap
              sectionOrder={sectionOrder}
              settings={settings}
              settingsPrefix={p}
              resortBlocks={resortBlocks}
              faqs={faqs}
              citiesSection={
                visibleCountries.length ? (
                  <section className="space-y-4">
                    <TitleUnderline as="h2">
                      <ParsedText text={get("citiesTitle") || "Популярные направления"} />
                    </TitleUnderline>
                    <ResortCards
                      cities={visibleCountries.map((c) => ({ slug: c.slug, name: c.name }))}
                      category="hot"
                      cardKind="country"
                      settings={settings}
                      settingsPrefix="hot"
                      hrefForCity={(country) => `/hot/${country.slug}/`}
                    />
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
