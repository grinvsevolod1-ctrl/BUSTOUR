import Link from "next/link"
import { Plus, Pencil, Archive, ExternalLink, EyeOff } from "lucide-react"
import { getCityDestinations } from "@/lib/cities"
import { getCountries } from "@/lib/countries"
import { countToursByCityId } from "@/lib/queries"
import { getSettings } from "@/lib/cms"
import { deleteCityAction, moveCityAction, reorderCitiesAction } from "@/app/admin/city-actions"
import { cn } from "@/lib/utils"
import { VisibilityToggle } from "@/components/admin/visibility-toggle"
import { ConfirmActionForm } from "@/components/admin/confirm-action-form"
import { SortOrderButtons } from "@/components/admin/sort-order-buttons"
import { DragHandle } from "@/components/admin/drag-reorder-control"
import { SortableTableBody } from "@/components/admin/reorder/sortable-collections"
import { adminCityOpenHref } from "@/lib/admin-public-href"
import { CountryGroupTable } from "@/components/admin/country-group-table"
import {
  PageHeader,
  ButtonLink,
  TableWrap,
  Thead,
  Th,
  Td,
  Tr,
  IconButton,
  IconLink,
  EmptyState,
} from "@/components/admin/ui"
import type { CityDestination } from "@/lib/types"

const NO_COUNTRY = "Без страны"

function groupByCountry(cities: CityDestination[]): Map<string, CityDestination[]> {
  const map = new Map<string, CityDestination[]>()
  for (const c of cities) {
    const key = c.country || NO_COUNTRY
    const g = map.get(key)
    if (g) g.push(c)
    else map.set(key, [c])
  }
  return map
}

const tabs = [
  { value: "bus", label: "Автобусные" },
  { value: "avia", label: "Авиа" },
  { value: "hot", label: "Горящие" },
] as const

export default async function AdminCitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; error?: string; notice?: string }>
}) {
  const { category, error } = await searchParams
  const active = category === "avia" ? "avia" : category === "hot" ? "hot" : "bus"
  const [cities, allCountries, settings] = await Promise.all([getCityDestinations(active), getCountries(active), getSettings()])
  // Tours only on bus — no empty-tour counts/badges for avia/hot
  const tourCountByCityId =
    active === "bus"
      ? Object.fromEntries(
          await Promise.all(cities.map(async (c) => [c.id, await countToursByCityId(c.id)] as const)),
        )
      : {}
  const countrySlugById = Object.fromEntries(allCountries.map((c) => [c.id, c.slug]))
  const countrySlugByName = Object.fromEntries(allCountries.map((c) => [c.name, c.slug]))
  const homeVisible =
    active === "avia"
      ? settings["aviatory.visible"] !== "0"
      : active === "hot"
      ? settings["hot.visible"] !== "0"
      : settings["bustours.visible"] !== "0"

  const groups = groupByCountry(cities)
  const countryOrder = new Map(allCountries.map((c, i) => [c.name, i]))
  const sortedCountryNames = [...groups.keys()].sort((a, b) => {
    if (a === NO_COUNTRY) return 1
    if (b === NO_COUNTRY) return -1
    return (countryOrder.get(a) ?? 1e9) - (countryOrder.get(b) ?? 1e9)
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Города-направления"
        description={`Подкатегории туров по разделам · В разделе: ${cities.length}`}
      >
        <ButtonLink href={`/admin/cities/new?category=${active}`}>
          <Plus className="h-4 w-4" /> {active === "hot" ? "Новое направление" : "Новый город"}
        </ButtonLink>
      </PageHeader>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-admin-danger" role="alert">
          {error}
        </div>
      ) : null}

      <div className="flex gap-1 border-b border-admin-border">
        {tabs.map((tab) => {
          const isActive = tab.value === active
          return (
            <Link
              key={tab.value}
              href={`/admin/cities?category=${tab.value}`}
              className={cn(
                "-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "border-cyan-accent text-cyan-accent"
                  : "border-transparent text-admin-fg-muted hover:text-admin-fg",
              )}
            >
              {tab.label}
            </Link>
          )
        })}
      </div>

      {cities.length === 0 ? (
        <EmptyState
          title="Направлений пока нет"
          description={
            active === "avia"
              ? "Добавьте город, чтобы он появился в сайдбаре авиатуров."
              : active === "hot"
              ? "Добавьте направление — страну и курорт для горящих туров."
              : "Добавьте город, чтобы он появился в сайдбаре автобусных туров."
          }
        >
          <ButtonLink href={`/admin/cities/new?category=${active}`} className="mt-3">
            <Plus className="h-4 w-4" /> {active === "hot" ? "Добавить направление" : "Добавить город"}
          </ButtonLink>
        </EmptyState>
      ) : (
        <div className="space-y-4">
          {sortedCountryNames.map((country) => {
            const groupCities = groups.get(country)!
            return (
              <CountryGroupTable
                key={country}
                country={country}
                cities={groupCities}
                reorderAction={reorderCitiesAction}
                moveAction={moveCityAction}
                deleteAction={deleteCityAction}
                settings={settings}
                countrySlugById={countrySlugById}
                countrySlugByName={countrySlugByName}
                homeVisible={homeVisible}
                tourCountByCityId={tourCountByCityId}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
