import { notFound, permanentRedirect } from "next/navigation"
import type { Metadata } from "next"
import { getTour, getTourById, getTours, getRelatedTours, getReviewsByTour, getSlugMaps } from "@/lib/queries"
import { TourPageContent } from "@/components/site/tour-page-content"
import { isTourVisible } from "@/lib/cms"
import { getPublicSettings } from "@/lib/cms"
import { expandPlainText } from "@/lib/expand-content-blocks"
import { metadataFromSettings } from "@/lib/seo-metadata"
import { stripArchivedSuffix } from "@/lib/archive-slug"
import { previewAllows, readAuthorizedPreview } from "@/lib/preview-access"
import { tourUrl } from "@/lib/tour-url"

/** Preview token / searchParams must not fight static shell (DYNAMIC_SERVER_USAGE 500). */
export const dynamic = "force-dynamic"

function querySuffix(sp?: Record<string, string | string[] | undefined>): string {
  if (!sp) return ""
  const u = new URLSearchParams()
  for (const [key, value] of Object.entries(sp)) {
    if (value == null) continue
    if (Array.isArray(value)) for (const item of value) u.append(key, item)
    else u.set(key, value)
  }
  const s = u.toString()
  return s ? `?${s}` : ""
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ countrySlug: string; citySlug: string; tourSlug: string }>
}): Promise<Metadata> {
  const { countrySlug, citySlug, tourSlug } = await params
  const [tour, settings] = await Promise.all([getTour(tourSlug), getPublicSettings()])
  if (!tour) return { title: "Тур — БасТур" }
  const [title, description] = await Promise.all([
    expandPlainText(`${tour.title} — БасТур`),
    expandPlainText(tour.description),
  ])
  const path =
    tourUrl({
      tourSlug: tour.slug,
      countrySlug,
      citySlug,
    }) ?? undefined
  return metadataFromSettings(settings, `tour:${tour.id}`, title, description, path ? { path: path } : undefined)
}

export default async function BusTourPage({
  params,
  searchParams,
}: {
  params: Promise<{ countrySlug: string; citySlug: string; tourSlug: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const { countrySlug, citySlug, tourSlug } = await params
  const preview = await readAuthorizedPreview(searchParams)
  const tour =
    preview?.type === "tour" ? await getTourById(preview.id) : await getTour(tourSlug)
  if (!tour) notFound()
  if (tour.archived) {
    if (!(await previewAllows(searchParams, "tour", tour.id))) notFound()
  } else if (!(await isTourVisible(tour.slug))) {
    notFound()
  }

  const liveSlug = stripArchivedSuffix(tour.slug)
  const canonical = tourUrl({
    tourSlug: liveSlug,
    countrySlug: tour.countrySlug,
    citySlug: tour.citySlug,
  })
  if (!canonical) notFound()

  // #72: wrong/outdated country or city segment must not 200 as a duplicate URL
  if (
    countrySlug !== tour.countrySlug ||
    citySlug !== tour.citySlug ||
    stripArchivedSuffix(tourSlug) !== liveSlug
  ) {
    const resolvedSearch = searchParams ? await searchParams : undefined
    permanentRedirect(`${canonical}${querySuffix(resolvedSearch)}`)
  }

  const [related, slugMaps, titleLabel] = await Promise.all([
    getRelatedTours(liveSlug, 4),
    getSlugMaps(),
    expandPlainText(tour.title),
  ])

  return (
    <TourPageContent
      tour={tour}
      related={related}
      reviews={await getReviewsByTour(tour.title)}
      breadcrumbItems={[
        { label: "Главная", href: "/" },
        { label: "Автобусные туры", href: "/avtobusnye-tury/" },
        {
          label: tour.country,
          href: tour.countrySlug ? `/avtobusnye-tury/${tour.countrySlug}/` : undefined,
        },
        {
          label: slugMaps.cityNameById[tour.arrivalCityId] ?? citySlug,
          href:
            tour.countrySlug && tour.citySlug
              ? `/avtobusnye-tury/${tour.countrySlug}/${tour.citySlug}/`
              : undefined,
        },
        { label: titleLabel },
      ]}
      slugMaps={slugMaps}
    />
  )
}
