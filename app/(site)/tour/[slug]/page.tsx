/**
 * /tour/[slug] — legacy URL, permanently redirected to the new canonical URL.
 *
 * New structure:
 *   /avtobusnye-tury/{countrySlug}/{citySlug}/{tourSlug}/
 */
import { notFound, redirect } from "next/navigation"
import { getTour, getTours, getSlugMaps } from "@/lib/queries"
import { tourUrl } from "@/lib/tour-url"
import { isTourVisible } from "@/lib/cms"

export const dynamic = "force-dynamic"

export default async function LegacyTourRedirect({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const [tour, slugMaps] = await Promise.all([getTour(slug), getSlugMaps()])
  if (!tour || !(await isTourVisible(tour.slug))) notFound()

  const url = tourUrl({
    tourSlug: tour.slug,
    countrySlug: slugMaps.countrySlugById[tour.countryId],
    citySlug: slugMaps.citySlugById[tour.arrivalCityId],
  })
  if (!url) notFound()

  redirect(url)
}
