import { CityForm } from "@/components/admin/city-form"
import { getCountries } from "@/lib/countries"

export default async function NewCityPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>
}) {
  const { category } = await searchParams
  const defaultCategory = category === "avia" ? "avia" : category === "hot" ? "hot" : "bus"

  const allCountries = await getCountries(defaultCategory)
  const countriesOptions = allCountries.map((c) => ({ id: c.id, name: c.name }))

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink">
        {defaultCategory === "hot" ? "Новое направление (горящие туры)" : "Новый город-направление"}
      </h1>
      <CityForm defaultCategory={defaultCategory} countries={countriesOptions} />
    </div>
  )
}
