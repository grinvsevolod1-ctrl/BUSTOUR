import { notFound } from "next/navigation"
import { getSlugMaps, getTourById } from "@/lib/queries"
import { getCurrencies } from "@/lib/currencies-server"
import { TourPricingEditor } from "@/components/admin/tour-pricing-editor"

export default async function TourPricingEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [tour, { cityNameById }, currencies] = await Promise.all([
    getTourById(Number(id)),
    getSlugMaps(),
    getCurrencies(),
  ])
  if (!tour) notFound()
  const cityName = cityNameById[tour.arrivalCityId] || tour.citySlug || "—"
  return <TourPricingEditor tour={tour} cityName={cityName} currencies={currencies} />
}
