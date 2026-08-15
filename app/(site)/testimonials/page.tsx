import type { Metadata } from "next"
import { Breadcrumb } from "@/components/site/breadcrumb"
import { TitleUnderline } from "@/components/site/title-underline"
import { ReviewsSection } from "@/components/site/reviews-section"
import { ReviewsJsonLd } from "@/components/site/reviews-json-ld"
import { OrderedCallUs } from "@/components/site/ordered-callus"
import { OrderedFaqSection } from "@/components/site/ordered-faq-section"
import { TestimonialButton } from "@/components/site/testimonial-button"
import { getApprovedReviews } from "@/lib/queries"
import { getFaqBlocksForPage, getPublicSettings, getSiteOrigin } from "@/lib/cms"
import { isCallusSectionKey } from "@/lib/multipliable-sections"
import { expandPublicList } from "@/lib/expand-content-blocks"
import { metadataFromSettings } from "@/lib/seo-metadata"
import {
  REVIEWS_PAGE_CMS_KEY,
  REVIEWS_PAGE_LEGACY_CMS_KEY,
  resolveReviewsPageCmsPrefix,
  resolveReviewsPageSectionOrder,
} from "@/lib/reviews-page-cms"

/** Docker/`next build` has no DB — without this, page SSGs with empty reviews forever. */
export const dynamic = "force-dynamic"

const REVIEWS_META_FALLBACK_DESC =
  "Реальные отзывы наших туристов о турах и поездках. Поделитесь своим впечатлением."

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicSettings()
  return metadataFromSettings(settings, "reviews", "Отзывы — БасТур", REVIEWS_META_FALLBACK_DESC, {
    path: "/testimonials",
  })
}

export default async function ReviewsPage() {
  const [rawReviews, settings, faqsReviews, faqsLegacy] = await Promise.all([
    getApprovedReviews("testimonials"),
    getPublicSettings(),
    getFaqBlocksForPage(REVIEWS_PAGE_CMS_KEY),
    getFaqBlocksForPage(REVIEWS_PAGE_LEGACY_CMS_KEY),
  ])
  const reviews = await expandPublicList(rawReviews)

  const sectionOrder = resolveReviewsPageSectionOrder(settings)
  const cmsPrefix = resolveReviewsPageCmsPrefix(settings)
  const faqPageKey = faqsReviews.length ? REVIEWS_PAGE_CMS_KEY : REVIEWS_PAGE_LEGACY_CMS_KEY
  const allFaqs = faqsReviews.length ? faqsReviews : faqsLegacy

  const siteUrl = getSiteOrigin(settings)

  return (
    <>
      <ReviewsJsonLd
        reviews={reviews}
        brandName={settings["site.brand"] || "БасТур"}
        url={`${siteUrl}/testimonials`}
        itemReviewed={{
          "@type": "TravelAgency",
          name: settings["site.brand"] || "БасТур",
          url: siteUrl,
        }}
      />
      <main className="mx-auto w-full max-w-[1440px] px-4 py-8 md:px-6">
        <Breadcrumb
          items={[{ label: "Главная", href: "/" }, { label: "Компания", href: "/company" }, { label: "Отзывы" }]}
        />

        <div className="space-y-10">
          <section className="flex flex-col gap-4">
            <TitleUnderline as="h1">
              {settings["testimonials.pageTitle"] || "Отзывы"}
            </TitleUnderline>
            <p className="w-full text-base leading-relaxed text-ink text-pretty break-words">
              {settings["testimonials.pageIntro"] ||
                "Дорогие друзья, на этой странице мы публикуем реальные отзывы наших туристов о поездках. Если вы хотите поделиться своим впечатлением от тура, воспользуйтесь, пожалуйста, формой отправки отзыва. После проверки менеджером ваш отзыв будет размещен на сайте."}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <TestimonialButton
                label={settings["testimonials.pageButton"] || "Оставить отзыв"}
              />
            </div>
          </section>
        </div>
      </main>

      <ReviewsSection reviews={reviews} />

      <div className="mx-auto w-full max-w-[1440px] space-y-6 px-4 py-6 md:px-6">
        {sectionOrder.map((key) => {
          if (key === "faq" || /^faq\d+$/.test(key)) {
            return (
              <OrderedFaqSection
                key={key}
                sectionKey={key}
                pageKey={faqPageKey}
                settings={settings}
                allFaqs={allFaqs}
                defaultTitle={settings["title.faq"] || "Частые вопросы"}
              />
            )
          }
          if (isCallusSectionKey(key)) {
            return (
              <OrderedCallUs
                key={key}
                sectionKey={key}
                settingsPrefix={cmsPrefix}
                settings={settings}
              />
            )
          }
          return null
        })}
      </div>
    </>
  )
}
