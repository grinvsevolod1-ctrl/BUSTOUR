import type { CityDestination, Country } from "@/lib/types"

export type TourDestinationResolution = {
  countryId: number
  arrivalCityId: number
  error?: string
}

function normalized(value: string): string {
  return value.trim().toLocaleLowerCase()
}

export function resolveBusTourDestinations(
  countryName: string,
  cityName: string,
  busCountries: Country[],
  busCities: CityDestination[],
): TourDestinationResolution {
  const countryText = countryName.trim()
  if (!countryText) return { countryId: 0, arrivalCityId: 0, error: "Выберите страну." }

  const country = busCountries.find(
    (candidate) => candidate.category === "bus" && normalized(candidate.name) === normalized(countryText),
  )
  if (!country) {
    return {
      countryId: 0,
      arrivalCityId: 0,
      error: `Страна «${countryText}» не найдена среди автобусных стран.`,
    }
  }

  const cityText = cityName.trim()
  if (!cityText) return { countryId: country.id, arrivalCityId: 0, error: "Выберите город прибытия." }

  const city = busCities.find(
    (candidate) =>
      candidate.category === "bus" &&
      candidate.countryId === country.id &&
      normalized(candidate.name) === normalized(cityText),
  )
  if (!city) {
    return {
      countryId: country.id,
      arrivalCityId: 0,
      error: `Город «${cityText}» не найден среди автобусных городов страны «${country.name}».`,
    }
  }

  return { countryId: country.id, arrivalCityId: city.id }
}

export function resolveBusTourDestinationIds(
  countryIdValue: string,
  cityIdValue: string,
  busCountries: Country[],
  busCities: CityDestination[],
): TourDestinationResolution {
  const countryId = Number(countryIdValue)
  const country = Number.isInteger(countryId) ? busCountries.find((item) => item.category === "bus" && item.id === countryId) : undefined
  if (!country) return { countryId: 0, arrivalCityId: 0, error: "Выберите существующую автобусную страну." }
  const arrivalCityId = Number(cityIdValue)
  const city = Number.isInteger(arrivalCityId) ? busCities.find((item) => item.category === "bus" && item.id === arrivalCityId && item.countryId === country.id) : undefined
  if (!city) return { countryId: country.id, arrivalCityId: 0, error: "Выберите город прибытия для выбранной страны." }
  return { countryId: country.id, arrivalCityId: city.id }
}
