import { notFound } from "next/navigation"
import { getCityById, getCityDestination } from "@/lib/cities"
import { getCountry, getCountryById } from "@/lib/countries"
import type { CityCategory, CityDestination, Country } from "@/lib/types"
import { previewAllows, readAuthorizedPreview } from "@/lib/preview-access"

type SearchParams = Promise<Record<string, string | string[] | undefined>> | undefined

export async function resolveCityPage(
  category: CityCategory,
  citySlug: string,
  searchParams: SearchParams,
): Promise<CityDestination | undefined> {
  const preview = await readAuthorizedPreview(searchParams)
  if (preview?.type === "city") {
    const city = await getCityById(preview.id)
    if (city?.category === category) return city
  }
  return getCityDestination(citySlug, category)
}

export async function assertCityPreviewAccess(
  city: CityDestination,
  searchParams: SearchParams,
): Promise<boolean> {
  if (!city.archived) return true
  return previewAllows(searchParams, "city", city.id)
}

export async function resolveCountryPage(
  category: "bus" | "avia" | "hot",
  countrySlug: string,
  searchParams: SearchParams,
): Promise<Country | undefined> {
  const preview = await readAuthorizedPreview(searchParams)
  if (preview?.type === "country") {
    const country = await getCountryById(preview.id)
    if (country?.category === category) return country
  }
  return getCountry(countrySlug, category)
}

export async function assertCountryPreviewAccess(
  country: Country,
  searchParams: SearchParams,
): Promise<boolean> {
  if (!country.archived) return true
  return previewAllows(searchParams, "country", country.id)
}

export function requireOrNotFound<T>(value: T | undefined | null): T {
  if (!value) notFound()
  return value
}
