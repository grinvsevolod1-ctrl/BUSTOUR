import { Calendar, MapPin, Moon, Bus } from "lucide-react"
import { Breadcrumb } from "@/components/site/breadcrumb"
import { TourGallery } from "@/components/site/tour-gallery"
import { BookingForm } from "@/components/site/booking-form"
import { TourCard } from "@/components/site/tour-card"
import { SectionTitle } from "@/components/site/section-title"
import { TitleUnderline } from "@/components/site/title-underline"
import { PageExtras } from "@/components/site/page-extras"
import { WhatIncluded } from "@/components/site/what-included"
import { RichContent } from "@/components/site/rich-content"
import { ParsedText } from "@/components/site/parsed-text"
import { Alert } from "@/components/site/alert"
import { TourNav } from "@/components/site/tour-nav"
import { ProgramTimeline } from "@/components/site/program-timeline"
import { DatesTable } from "@/components/site/dates-table"
import { hasDatesTable } from "@/lib/dates-table"
import { TourDocuments } from "@/components/site/tour-documents"
import { CallUs } from "@/components/site/call-us"
import { TourReviewsBlock } from "@/components/site/tour-reviews-block"
import { getCurrencies } from "@/lib/currencies-server"
import { getPublicSettings, isOn } from "@/lib/cms"
import { expandPlainText, expandPublicDeep, expandPublicList } from "@/lib/expand-content-blocks"
import { resolveTourLayout, anchoredSectionKeys } from "@/lib/tour-sections"
import { buildGallerySlides, collectMediaIds } from "@/lib/media-node"
import { getDefaultAltsByMediaIds } from "@/lib/media-service"
import { getCanonicalOrigin } from "@/lib/canonical-origin"
import {
  absoluteUrl,
  buildProductOfferJsonLd,
  serializeJsonLd,
} from "@/lib/site-schema"
import { reviewsToSchemaItems } from "@/components/site/reviews-json-ld"
import { withProductReviews } from "@/lib/reviews-schema"
import type { Tour, IncludedGroup, Review, TourSectionKey } from "@/lib/types"

type BreadcrumbItem = { label: string; href?: string }
type SlugMaps = { countrySlugById: Record<number, string>; citySlugById: Record<number, string> }

const defaultProgram = [
  { day: "День 1", text: "Выезд из Минска. Трансфер до места назначения, размещение в отеле, свободное время." },
  { day: "День 2", text: "Завтрак. Обзорная экскурсия по городу с посещением главных достопримечательностей." },
  { day: "День 3", text: "Свободный день или дополнительные экскурсии по желанию. Прогулки и шопинг." },
  { day: "День 4", text: "Завтрак, освобождение номеров. Обратный трансфер в Минск." },
]

const defaultWhatIncluded: IncludedGroup[] = [
  {
    title: "В стоимость включено",
    marker: "check",
    items: [
      "Проезд комфортабельным автобусом",
      "Проживание в отеле выбранной категории",
      "Завтраки в отеле",
      "Сопровождение гида на всём маршруте",
      "Экскурсионная программа",
    ],
  },
  {
    title: "Оплачивается отдельно",
    marker: "cross",
    items: ["Личные расходы", "Дополнительные экскурсии", "Обеды и ужины", "Медицинская страховка"],
  },
]

export async function TourPageContent({
  tour: rawTour,
  related: rawRelated,
  reviews,
  reviewsTitle = "Отзывы о туре",
  breadcrumbItems,
  slugMaps,
}: {
  tour: Tour
  related: Tour[]
  reviews: Review[]
  reviewsTitle?: string
  breadcrumbItems: BreadcrumbItem[]
  slugMaps: SlugMaps
}) {
  const [tour, related, reviewsExpanded, currencies, settings, seoTitle, alertText] =
    await Promise.all([
      expandPublicDeep(rawTour),
      expandPublicList(rawRelated),
      expandPublicList(reviews),
      getCurrencies(),
      getPublicSettings(),
      expandPlainText(rawTour.seoTitle),
      expandPlainText(rawTour.alertText ?? ""),
    ])

  const galleryNodes = tour.gallery.length ? tour.gallery : [tour.cover]
  const defaultAlts = await getDefaultAltsByMediaIds(collectMediaIds(galleryNodes))
  const gallerySlides = buildGallerySlides(galleryNodes, defaultAlts, tour.title)
  const program = tour.program.length ? tour.program : defaultProgram
  const whatIncluded: IncludedGroup[] = tour.whatIncluded.length
    ? tour.whatIncluded
    : tour.included.length || tour.excluded.length
      ? ([
          { title: "В стоимость включено", marker: "check", items: tour.included },
          { title: "Оплачивается отдельно", marker: "cross", items: tour.excluded },
        ] as IncludedGroup[]).filter((g) => g.items.length)
      : defaultWhatIncluded

  const infoItems = [
    { icon: Calendar, label: "Длительность", value: tour.duration },
    { icon: Bus, label: "Отправление", value: tour.departure },
    { icon: MapPin, label: "Страна", value: tour.country },
    { icon: Moon, label: "Ночей", value: String(tour.nights) },
  ].filter((i) => i.value && i.value !== "0")

  const layout = resolveTourLayout(tour.layout)
  const hasDates = hasDatesTable(tour.datesTable)

  const sectionNodes: Record<TourSectionKey, { title?: string; node: React.ReactNode } | null> = {
    dates: hasDates ? { title: layout.find((section) => section.key === "dates")?.label || "Даты и цены", node: <DatesTable data={tour.datesTable} tourTitle={tour.title} /> } : null,
    callus:
      isOn(settings, "section.callus") && isOn(settings, "page.tour.callus")
        ? {
            node: (
              <CallUs
                title={settings["callus.title"] ?? "Остались вопросы?"}
                subtitle={settings["callus.subtitle"] ?? "Перезвоним и подберём тур"}
                button={settings["callus.button"] ?? "Заказать звонок"}
              />
            ),
          }
        : null,
    program: { title: "Программа тура", node: <ProgramTimeline items={program} /> },
    included: { title: "Что входит в тур", node: <WhatIncluded groups={whatIncluded} /> },
    gallery: { node: <TourGallery slides={gallerySlides} /> },
    seo: tour.seoHtml.trim()
      ? {
          node: (
            <>
              {seoTitle.trim() ? <TitleUnderline as="h2">{seoTitle}</TitleUnderline> : null}
              <RichContent html={tour.seoHtml} />
            </>
          ),
        }
      : null,
    documents: tour.documents.length
      ? { title: "Полезные документы", node: <TourDocuments documents={tour.documents} /> }
      : null,
    faq: { node: <PageExtras pageKey="tour" faqScope={`tour:${tour.slug}`} showCallUs={false} bare /> },
    reviews: reviewsExpanded.length
      ? {
          // #108: heading lives in TourReviewsBlock (TitleUnderline); avoid duplicate s.label
          node: <TourReviewsBlock reviews={reviewsExpanded} title={reviewsTitle} />,
        }
      : null,
  }

  const sections = layout.filter((s) => s.visible && sectionNodes[s.key])
  const navItems = sections
    .filter((s) => anchoredSectionKeys.includes(s.key))
    .map((s) => ({ id: s.key, label: s.label }))

  const origin = getCanonicalOrigin()
  const tourPath =
    tour.countrySlug && tour.citySlug
      ? `/avtobusnye-tury/${tour.countrySlug}/${tour.citySlug}/${tour.slug}/`
      : undefined
  const tourUrl = tourPath ? absoluteUrl(origin, tourPath) : undefined
  const imageAbs = absoluteUrl(origin, tour.image)
  const productSchema = buildProductOfferJsonLd({
    name: tour.title,
    description: tour.description,
    image: imageAbs,
    url: tourUrl,
    category: "Автобусные туры",
    brandName: settings["site.brand"] || "БасТур",
    price: String(tour.priceAmount || tour.price.replace(/[^\d.]/g, "") || "0"),
    priceCurrency: tour.price.includes("$") ? "USD" : tour.price.includes("€") ? "EUR" : "BYN",
    hasAvailability: hasDates,
  })
  const productWithReviews = productSchema
    ? withProductReviews(productSchema, reviewsToSchemaItems(reviewsExpanded))
    : null

  return (
    <>
      <main className="mx-auto w-full max-w-[1440px] space-y-8 px-4 py-8 md:px-6">
        {productWithReviews ? (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: serializeJsonLd(productWithReviews) }}
          />
        ) : null}
        <Breadcrumb items={breadcrumbItems} />
        <div className="space-y-4">
          <TitleUnderline as="h1"><ParsedText text={tour.title} /></TitleUnderline>
          <Alert text={alertText} type={tour.alertType} />
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          <div className="min-w-0 space-y-6">
            {infoItems.length ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {infoItems.map((item) => (
                  <div key={item.label} className="flex min-w-0 items-center gap-2 rounded bg-cream p-3 sm:gap-3">
                    <item.icon className="h-5 w-5 shrink-0 text-brand sm:h-6 sm:w-6" strokeWidth={1.75} />
                    <div className="min-w-0 leading-tight">
                      <div className="truncate text-xs text-ink-muted">{item.label}</div>
                      <div className="break-words text-sm font-semibold text-ink">{item.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
          <aside className="hidden lg:sticky lg:top-6 lg:block lg:h-fit">
            <BookingForm
              price={tour.price}
              amount={tour.priceAmount}
              currencies={currencies}
              tour={tour.title}
              extraPriceAmount={tour.extraPriceAmount}
              extraPriceCurrency={tour.extraPriceCurrency}
            />
          </aside>
        </div>

        <TourNav items={navItems} />

        {sections.map((s) => {
          const content = sectionNodes[s.key]!
          const anchored = anchoredSectionKeys.includes(s.key)
          return (
            <section key={s.key} id={anchored ? s.key : undefined} className="space-y-4 scroll-mt-6">
              {content.title ? <TitleUnderline as="h2">{s.label}</TitleUnderline> : null}
              {content.node}
            </section>
          )
        })}

        <section className="space-y-6 pt-4">
          <SectionTitle>Похожие направления</SectionTitle>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((t) => (
              <TourCard
                key={t.slug}
                tour={t}
                currencies={currencies}
                countrySlug={slugMaps.countrySlugById[t.countryId]}
                citySlug={slugMaps.citySlugById[t.arrivalCityId]}
              />
            ))}
          </div>
        </section>
      </main>
    </>
  )
}
