import { notFound } from "next/navigation"
import { getTourById } from "@/lib/queries"
import { getCountries } from "@/lib/countries"
import { getCityDestinations, getCityById } from "@/lib/cities"
import { getCurrencies } from "@/lib/currencies-server"
import { getBlocks, getSettings, isTourVisible } from "@/lib/cms"
import { groupFaqBlocks } from "@/lib/faq-form"
import { getBusTourTypes } from "@/lib/bus-tour-types"
import { TourForm } from "@/components/admin/tour-form"

export default async function EditTourPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const tour = await getTourById(Number(id))
  if (!tour) notFound()

  const [countries, cities, currencies, faqBlocks, arrivalCity, tourVisible, settings, tourTypes] = await Promise.all([
    getCountries("bus"),
    getCityDestinations("bus"),
    getCurrencies(),
    getBlocks("faq", { page: `tour:${tour.slug}` }),
    tour.arrivalCityId ? getCityById(tour.arrivalCityId) : Promise.resolve(undefined),
    isTourVisible(tour.slug),
    getSettings(),
    getBusTourTypes(),
  ])
  const faqs = faqBlocks.map((b) => ({ question: b.title, answer: b.body }))
  const faqGroups = groupFaqBlocks(faqBlocks, "").map((g) => ({
    title: g.title,
    items: g.items.map((b) => ({ question: b.title, answer: b.body })),
  }))

  return (
    <div className="space-y-6">
      <TourForm
        tour={tour}
        countries={countries}
        cities={cities}
        currencies={currencies}
        tourTypes={tourTypes.map((t) => t.name)}
        faqs={faqs}
        faqGroups={faqGroups}
        arrivalCityName={arrivalCity?.name ?? ""}
        tourVisible={tourVisible}
        tourMeta={Object.fromEntries(
          ["metaTitle", "metaDescription", "metaShortDesc", "metaImage"].map((key) => [
            key,
            settings[`tour:${tour.id}.${key}`] ?? "",
          ]),
        )}
      />
    </div>
  )
}
