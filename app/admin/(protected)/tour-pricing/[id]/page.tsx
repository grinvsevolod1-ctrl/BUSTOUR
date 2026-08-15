import { notFound } from "next/navigation"
import { getSlugMaps, getTourById } from "@/lib/queries"
import { TourPricingEditor } from "@/components/admin/tour-pricing-editor"

export default async function TourPricingEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [tour, { cityNameById }] = await Promise.all([getTourById(Number(id)), getSlugMaps()])
  if (!tour) notFound()
  const cityName = cityNameById[tour.arrivalCityId] || tour.citySlug || "—"
  return <TourPricingEditor tour={tour} cityName={cityName} />
}
