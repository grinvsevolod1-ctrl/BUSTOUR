import { TourForm } from "@/components/admin/tour-form"
import { getCountries } from "@/lib/countries"
import { getCityDestinations } from "@/lib/cities"
import { getCurrencies } from "@/lib/currencies-server"
import { getBusTourTypes } from "@/lib/bus-tour-types"

export default async function NewTourPage() {
  const [countries, cities, currencies, tourTypes] = await Promise.all([
    getCountries("bus"),
    getCityDestinations("bus"),
    getCurrencies(),
    getBusTourTypes(),
  ])

  return (
    <div className="space-y-6">
      <TourForm
        countries={countries}
        cities={cities}
        currencies={currencies}
        tourTypes={tourTypes.map((t) => t.name)}
      />
    </div>
  )
}
