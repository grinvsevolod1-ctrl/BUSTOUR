import { Hero } from "@/components/site/hero"
import { SearchForm } from "@/components/site/search-form"
import { SectionTitle } from "@/components/site/section-title"
import { PublicFeaturedTours } from "@/components/site/public-tours"
import { Advantages } from "@/components/site/advantages"
import { OrderedFaqSection } from "@/components/site/ordered-faq-section"
import { getHomeTourOffers, getApprovedReviews } from "@/lib/queries"
import { getPublicSettings, getBlocks, getFaqBlocksForPage, isOn } from "@/lib/cms"
import { expandPublicList } from "@/lib/expand-content-blocks"
import { metadataFromSettings } from "@/lib/seo-metadata"
import { resolveInitialOrder } from "@/lib/section-order"
import { MULTIPLIABLE_SECTION_BASES, isCallusSectionKey } from "@/lib/multipliable-sections"
import { Testimonials } from "@/components/site/testimonials"
import { OrderedCallUs } from "@/components/site/ordered-callus"
import { OfficeMapBlock } from "@/components/site/office-map"
import { buildWebSiteJsonLd, serializeJsonLd } from "@/lib/site-schema"

/** Section toggles (`section.placement` etc.) must apply immediately after admin save. */
export const dynamic = "force-dynamic"

export async function generateMetadata() {
  const settings = await getPublicSettings()
  return metadataFromSettings(settings, "home", "БасТур — автобусные и авиатуры из Минска", "Автобусные и авиатуры из Минска по Беларуси, Европе и популярным курортам.", { path: "/" })
}

const HOME_DEFAULT_ORDER = ["search", "featured", "advantages", "testimonials", "placement", "faq", "callus"]
const HOME_SECTION_KEYS = HOME_DEFAULT_ORDER

export default async function HomePage() {
  const [featured, rawReviews, settings, heroSlides, advantages, faqs] = await Promise.all([
    getHomeTourOffers(),
    getApprovedReviews("home", "VIDEO"),
    getPublicSettings(),
    getBlocks("hero", { onlyVisible: true }),
    getBlocks("advantage", { onlyVisible: true }),
    getFaqBlocksForPage("home", { onlyVisible: true }),
  ])
  const reviews = await expandPublicList(rawReviews)

  const sectionOrder = resolveInitialOrder(
    settings["home.sections.order"],
    HOME_DEFAULT_ORDER,
    HOME_SECTION_KEYS,
    [...MULTIPLIABLE_SECTION_BASES],
  )

  function renderSection(key: string) {
    if (!isOn(settings, `section.${key}`)) return null

    if (key === "search") {
      return (
        <section key={key} className="mx-auto w-full max-w-[1440px] space-y-6 px-4 py-8 md:px-6">
          <SectionTitle>{settings["title.search"]}</SectionTitle>
          <SearchForm />
        </section>
      )
    }

    if (key === "featured") {
      if (!featured.length) return null
      return (
        <section key={key} className="mx-auto w-full max-w-[1440px] space-y-6 px-4 py-6 md:px-6">
          <SectionTitle>{settings["title.featured"]}</SectionTitle>
          <PublicFeaturedTours tours={featured} eagerIndex={0} />
        </section>
      )
    }

    if (key === "advantages") {
      return <Advantages key={key} items={advantages} title={settings["title.advantages"]} />
    }

    if (key === "faq" || /^faq\d+$/.test(key)) {
      return <OrderedFaqSection key={key} sectionKey={key} pageKey="home" settings={settings} allFaqs={faqs} defaultTitle={settings["title.faq"] || "Частые вопросы"} />
    }

    if (key === "testimonials") {
      return (
        <Testimonials
          key={key}
          reviews={reviews}
          title={settings["title.testimonials"]}
          infoTitle={settings["testimonials.infoTitle"]}
          infoBody={settings["testimonials.infoBody"]}
          ctaLabel={settings["testimonials.homeCta"] || "Все отзывы"}
        />
      )
    }

    if (key === "placement") {
      return (
        <OfficeMapBlock
          key={key}
          className="mx-auto w-full max-w-[1440px] space-y-6 px-4 py-8 md:px-6"
          heading={settings["title.placement"] || "Наше расположение"}
          src={settings["site.mapEmbedUrl"]}
        />
      )
    }

    if (isCallusSectionKey(key)) {
      return (
        <OrderedCallUs
          key={key}
          sectionKey={key}
          settingsPrefix=""
          settings={settings}
          className="mx-auto w-full max-w-[1440px] px-4 py-8 md:px-6"
        />
      )
    }

    return null
  }

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(buildWebSiteJsonLd(settings)) }}
      />
      <Hero blocks={heroSlides} />
      {sectionOrder.map(renderSection)}
    </main>
  )
}
