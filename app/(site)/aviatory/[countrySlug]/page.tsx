import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { Breadcrumb } from "@/components/site/breadcrumb"
import { AviaTourSearchWidget } from "@/components/site/avia-tour-search-widget"
import { TitleUnderline } from "@/components/site/title-underline"
import { OrderedCallUs } from "@/components/site/ordered-callus"
import { isCallusSectionKey } from "@/lib/multipliable-sections"
import { RichContent } from "@/components/site/rich-content"
import { PageAlert } from "@/components/site/alert"
import { AviaSidebar } from "@/components/site/avia-sidebar"
import { ResortCards } from "@/components/site/resort-cards"
import { OrderedFaqSection } from "@/components/site/ordered-faq-section"
import { DestinationSectionMap } from "@/components/site/catalog/destination-section-map"
import { getPublicSettings, getFaqBlocksForPage, isOn, getResortBlocksForPage } from "@/lib/cms"
import { getCityDestinations } from "@/lib/cities"
import { getCountry, getCountries, getAviaCountries } from "@/lib/countries"
import { metadataFromSettings } from "@/lib/seo-metadata"
import { resolveCmsText } from "@/lib/catalog-cms-content"
import { resolveAviaSlug } from "@/lib/avia-slug"
import { resolveCountryPage, assertCountryPreviewAccess } from "@/lib/preview-resolve"
import { stripArchivedSuffix } from "@/lib/archive-slug"
import { ParsedText } from "@/components/site/parsed-text"
import { getShortcodesDict } from "@/lib/shortcodes"

export const dynamic = "force-dynamic"

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://bastur.by"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ countrySlug: string }>
}): Promise<Metadata> {
  const { countrySlug } = await params
  const settings = await getPublicSettings()
  const country = await getCountry(countrySlug, "avia")
  if (!country || country.category !== "avia") return { title: "Авиатуры — БасТур" }

  const p = `country:avia:${country.slug}`
  const pageSlug = (settings[`${p}.pageSlug`] ?? "").trim() || country.slug
  const aviaPrefix = `/${resolveAviaSlug(settings["aviatory.slug"])}`

  return {
    ...(await metadataFromSettings(
      settings,
      p,
      `Авиатуры в ${country.name} из Минска — БасТур`,
      country.intro.slice(0, 160) || `Авиатуры в ${country.name} из Минска`,
      { path: `${aviaPrefix}/${pageSlug}/` },
    )),
  }
}

export default async function AviaCountryPage({
  params,
  searchParams,
}: {
  params: Promise<{ countrySlug: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const { countrySlug } = await params
  const country = await resolveCountryPage("avia", countrySlug, searchParams)
  if (!country || country.category !== "avia") notFound()
  if (!(await assertCountryPreviewAccess(country, searchParams))) notFound()

  const settings = await getPublicSettings()
  const liveCountrySlug = stripArchivedSuffix(country.slug)
  // 404 if avia home or this country is hidden (skip visibility when previewing archived)
  if (!country.archived && !isOn(settings, "aviatory.visible")) notFound()
  if (!country.archived && !isOn(settings, `country:avia:${liveCountrySlug}.visible`)) notFound()

  const p = `country:avia:${liveCountrySlug}`
  const aviaPrefix = `/${resolveAviaSlug(settings["aviatory.slug"])}`

  // If admin has filled in H1 — render the rich template page
  const hasRichContent = !!settings[`${p}.h1`]

  const [faqs, allCities, aviaCountries, resortBlocks, shortcodesDict] =
    await Promise.all([
      // Only page-specific FAQs — no global fallback so admins can hide the section
      getFaqBlocksForPage(p, { onlyVisible: true }),
      getCityDestinations("avia"),
      getAviaCountries(settings),
      getResortBlocksForPage(p),
      getShortcodesDict(),
    ])

  const countryCities = allCities.filter((c) => c.country === country.name && (!settings || settings[`city:avia:${c.slug}.visible`] !== "0"))



  // Collect ALL SEO sections (seo, seo2, seo3…) in the admin-defined order.
  // Each slot stores to `${p}.seoHtml{N}` / `${p}.seoTitle{N}` (N omitted for the first).
  const sectionOrder = (() => {
    try {
      const raw = settings[`${p}.sections.order`]
      if (raw) return JSON.parse(raw) as string[]
    } catch {}
    return ["cities", "seo", "callus", "faq"]
  })()
  const seoSections = sectionOrder
    .filter((k) => k === "seo" || /^seo\d+$/.test(k))
    .map((k) => {
      const suffix = k === "seo" ? "" : k.replace("seo", "")
      return {
        key: k,
        title: settings[`${p}.seoTitle${suffix}`] ?? "",
        html: settings[`${p}.seoHtml${suffix}`] ?? "",
      }
    })
    .filter((s) => s.html && isOn(settings, `${p}.section.${s.key}`))

  // ── Rich template page ───────────────────────────────────────────────
  if (hasRichContent) {
    const get = (key: string) => settings[`${p}.${key}`] ?? ""

    return (
      <main className="mx-auto w-full max-w-[1440px] px-4 py-8 md:px-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-start">
          <AviaSidebar countries={aviaCountries} activeCountrySlug={liveCountrySlug} aviaPrefix={aviaPrefix} shortcodesDict={shortcodesDict} />
          <div className="min-w-0 flex-1 space-y-10">

            {/* Header */}
            <div className="space-y-6">
              <Breadcrumb
                items={[
                  { label: "Главная", href: "/" },
                  { label: "Авиатуры", href: `${aviaPrefix}/` },
                  { label: country.name },
                ]}
              />
              <div className="space-y-4">
                <TitleUnderline as="h1"><ParsedText text={get("h1") || `Авиатуры в ${country.name} из Минска`} /></TitleUnderline>
                <PageAlert
                  settings={settings}
                  prefix={p}
                />
                {resolveCmsText(get("intro")) ? (
                  <RichContent html={resolveCmsText(get("intro"))} />
                ) : null}
              </div>
              <AviaTourSearchWidget />
            </div>

            {/* Sections rendered in admin-defined order */}
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
                      <ParsedText text={get("citiesTitle") || `Популярные курорты в ${country.name}`} />
                    </TitleUnderline>
                    <ResortCards cities={countryCities} basePath={`${aviaPrefix}/${liveCountrySlug}`} category="avia" settings={settings} settingsPrefix={p} />
                  </section>
                ) : null
              }
            />

          </div>
        </div>
      </main>
    )
  }

  // ── Default page (no rich content, uses ToursListing layout) ──────
  const get = (key: string) => settings[`${p}.${key}`] ?? ""
  const header = (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Главная", href: "/" },
          { label: "Авиатуры", href: `${aviaPrefix}/` },
          { label: country.name },
        ]}
      />
      <div className="space-y-4">
        <TitleUnderline as="h1">
          <ParsedText text={get("h1") || `Авиатуры в ${country.name}`} />
        </TitleUnderline>
        <PageAlert settings={settings} prefix={p} />
        {resolveCmsText(get("intro")) ? (
          <RichContent html={resolveCmsText(get("intro"))} />
        ) : null}
      </div>
      <AviaTourSearchWidget />
    </div>
  )

  const seoContent = (
    <div className="space-y-10">
      {seoSections.map((s) => (
        <section key={s.key} className="space-y-4">
          {s.title && <TitleUnderline as="h2">{s.title}</TitleUnderline>}
          <RichContent html={s.html} />
        </section>
      ))}
      {isOn(settings, `${p}.section.cities`) && countryCities.length > 0 && (
        <section className="space-y-4">
          <TitleUnderline as="h2">
            <ParsedText text={get("citiesTitle") || `Популярные курорты в ${country.name}`} />
          </TitleUnderline>
          <ResortCards cities={countryCities} basePath={`${aviaPrefix}/${liveCountrySlug}`} category="avia" settings={settings} settingsPrefix={p} />
        </section>
      )}
    </div>
  )

  return (
    <main className="mx-auto w-full max-w-[1440px] px-4 py-8 md:px-6">
      <div className="flex flex-col gap-6 md:flex-row md:items-start">
        <AviaSidebar countries={aviaCountries} activeCountrySlug={liveCountrySlug} aviaPrefix={aviaPrefix} shortcodesDict={shortcodesDict} />
        <div className="min-w-0 flex-1 space-y-10">
          {header}
          {seoContent}
          {sectionOrder
            .filter(isCallusSectionKey)
            .map((key) => (
              <OrderedCallUs
                key={key}
                sectionKey={key}
                settingsPrefix={p}
                settings={settings}
              />
            ))}
          <OrderedFaqSection
            sectionKey="faq"
            pageKey={p}
            settings={settings}
            allFaqs={faqs}
            defaultTitle={settings["title.faq"]}
          />
        </div>
      </div>
    </main>
  )
}
