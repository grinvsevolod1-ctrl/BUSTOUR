import type { Metadata } from "next"
import { isCallusSectionKey } from "@/lib/multipliable-sections"
import { notFound } from "next/navigation"
import { Breadcrumb } from "@/components/site/breadcrumb"
import { TitleUnderline } from "@/components/site/title-underline"
import { RichContent } from "@/components/site/rich-content"
import { TourGallery } from "@/components/site/tour-gallery"
import { TourDocuments } from "@/components/site/tour-documents"
import { ResortComparisonBlocks } from "@/components/site/resort-comparison-blocks"
import { OrderedCallUs } from "@/components/site/ordered-callus"
import { OrderedFaqSection } from "@/components/site/ordered-faq-section"
import { BusOrderButton } from "@/components/site/bus-order-button"
import { getFaqs, getPublicSettings, isOn, getResortBlocksForPage } from "@/lib/cms"
import { getBus, getBusById, getBuses } from "@/lib/queries"
import { metadataFromSettings } from "@/lib/seo-metadata"
import { expandPlainText, expandPublicDeep } from "@/lib/expand-content-blocks"
import { ParsedText } from "@/components/site/parsed-text"
import { buildGallerySlides, collectMediaIds } from "@/lib/media/node"
import { getDefaultAltsByMediaIds } from "@/lib/media/service"
import { stripArchivedSuffix } from "@/lib/archive-slug"
import { previewAllows, readAuthorizedPreview } from "@/lib/preview-access"
import { busPageHeading } from "@/lib/bus-display"
import type { Bus } from "@/lib/types"

const BUS_DEFAULT_SECTION_ORDER = ["specs", "documents", "seating", "seo", "resorts", "faq", "callus"]

export const dynamic = "force-dynamic"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const [bus, settings] = await Promise.all([getBus(slug), getPublicSettings()])
  if (!bus) return { title: "Аренда автобусов — БасТур" }
  const pageKey = `bus:${bus.slug}`
  const heading = busPageHeading(settings, pageKey, bus.title)
  const [fallbackTitle, fallbackDesc] = await Promise.all([
    expandPlainText(`${heading} — аренда автобуса — БасТур`),
    expandPlainText(`${heading}: аренда автобуса на ${bus.seats || "комфортное"} места.`),
  ])
  return metadataFromSettings(settings, pageKey, fallbackTitle, fallbackDesc, {
    path: `/bus-rental/${bus.slug}`,
  })
}

function BusSpecsBlock({ bus }: { bus: Bus }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-y-2 border-brand py-3">
      <div className="space-y-1 text-sm text-ink-muted">
        {bus.year ? <p>Год выпуска: {bus.year}</p> : null}
        {bus.seats ? <p>Число мест: {bus.seats}</p> : null}
        {bus.busClass ? <p>Класс автобуса: {bus.busClass}</p> : null}
      </div>
      <BusOrderButton busTitle={bus.title} phone={bus.phone} />
    </div>
  )
}

export default async function BusDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const { slug } = await params
  const preview = await readAuthorizedPreview(searchParams)
  const rawBus = preview?.type === "bus" ? await getBusById(preview.id) : await getBus(slug)
  if (!rawBus) notFound()
  const bus = await expandPublicDeep(rawBus)

  const settings = await getPublicSettings()
  const liveSlug = stripArchivedSuffix(bus.slug)
  const pageKey = `bus:${liveSlug}`
  if (bus.archived) {
    if (!(await previewAllows(searchParams, "bus", bus.id))) notFound()
  } else if (!isOn(settings, `${pageKey}.visible`)) {
    notFound()
  }

  const [resortBlocks, faqs] = await Promise.all([
    getResortBlocksForPage(pageKey),
    getFaqs(pageKey),
  ])
  const sectionOrder = (() => {
    try {
      const raw = settings[`${pageKey}.sections.order`]
      if (raw) return JSON.parse(raw) as string[]
    } catch {}
    return BUS_DEFAULT_SECTION_ORDER
  })()
  const galleryNodes = bus.gallery.length ? bus.gallery : [bus.cover]
  const defaultAlts = await getDefaultAltsByMediaIds(collectMediaIds(galleryNodes))
  const pageHeading = busPageHeading(settings, pageKey, bus.title)
  const gallerySlides = buildGallerySlides(galleryNodes, defaultAlts, bus.title)

  return (
    <>
      <main className="mx-auto w-full max-w-[1440px] px-4 py-8 md:px-6">
        <Breadcrumb
          items={[
            { label: "Главная", href: "/" },
            { label: "Аренда автобусов", href: "/bus-rental" },
            { label: bus.title },
          ]}
        />
        <div className="space-y-8">
          <TitleUnderline as="h1"><ParsedText text={pageHeading} /></TitleUnderline>

          <TourGallery slides={gallerySlides} />

          {sectionOrder.map((key) => {
            if (key === "faq" || /^faq\d+$/.test(key)) {
              return (
                <OrderedFaqSection
                  key={key}
                  sectionKey={key}
                  pageKey={pageKey}
                  settings={settings}
                  allFaqs={faqs}
                  defaultTitle={settings["title.faq"] || "Частые вопросы"}
                />
              )
            }
            if (isCallusSectionKey(key)) {
              return (
                <OrderedCallUs
                  key={key}
                  sectionKey={key}
                  settingsPrefix={pageKey}
                  settings={settings}
                />
              )
            }
            if (key === "specs") {
              if (!isOn(settings, `${pageKey}.section.${key}`)) return null
              return <BusSpecsBlock key={key} bus={bus} />
            }
            if (key === "documents") {
              if (!bus.documents.length || !isOn(settings, `${pageKey}.section.${key}`)) return null
              return (
                <section key={key} className="space-y-4">
                  <TitleUnderline as="h3">Документы</TitleUnderline>
                  <TourDocuments documents={bus.documents} />
                </section>
              )
            }
            if (key === "seating") {
              if (!bus.seating.length || !isOn(settings, `${pageKey}.section.${key}`)) return null
              return (
                <section key={key} className="space-y-4">
                  <TitleUnderline as="h3">Рассадка в автобусе</TitleUnderline>
                  <TourDocuments documents={bus.seating} />
                </section>
              )
            }
            if (key === "resorts" || /^resorts\d+$/.test(key)) {
              if (!resortBlocks.length || !isOn(settings, `${pageKey}.section.${key}`)) return null
              const tableId = settings[`${pageKey}.section.${key}.tableId`]
              const blocks = tableId ? resortBlocks.filter((block) => String(block.id) === tableId) : resortBlocks
              return blocks.length ? (
                <ResortComparisonBlocks
                  key={key}
                  blocks={blocks}
                />
              ) : null
            }
            if (key === "seo" || /^seo\d+$/.test(key)) {
              const suffix = key === "seo" ? "" : key.replace("seo", "")
              const title = settings[`${pageKey}.seoTitle${suffix}`] ?? ""
              const html = settings[`${pageKey}.seoHtml${suffix}`] ?? ""
              if (!html || !isOn(settings, `${pageKey}.section.${key}`)) return null
              return (
                <section key={key} className="space-y-4">
                  {title ? <TitleUnderline as="h2">{title}</TitleUnderline> : null}
                  <RichContent html={html} />
                </section>
              )
            }
            return null
          })}
        </div>

      </main>
    </>
  )
}
