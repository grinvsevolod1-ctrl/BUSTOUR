import { getBusToursWithDates, getSlugMaps } from "@/lib/queries"
import { TourPricingWorkspace } from "@/components/admin/tour-pricing-workspace"

export default async function TourPricingPage() {
  const [tours, { cityNameById }] = await Promise.all([getBusToursWithDates(), getSlugMaps()])
  return <TourPricingWorkspace tours={tours} cityNameById={cityNameById} />
}
