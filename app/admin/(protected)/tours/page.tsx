import { Plus } from "lucide-react"
import { getTours, getSlugMaps } from "@/lib/queries"
import { getBusTourTypes } from "@/lib/bus-tour-types"
import { getCountries } from "@/lib/countries"
import { deleteTourAction, moveTourAction, reorderToursAction } from "@/app/admin/actions"
import { getHiddenTourSlugs } from "@/lib/cms"
import { BusTourTypeManager } from "@/components/admin/bus-tour-type-manager"
import { EditorWorkspace, type EditorWorkspaceGroup } from "@/components/admin/editor-workspace"
import { TourCountryGroupTable } from "@/components/admin/tour-country-group-table"
import { PageHeader, ButtonLink, EmptyState } from "@/components/admin/ui"
import type { Tour } from "@/lib/types"

export const dynamic = "force-dynamic"

const NO_COUNTRY = "Без страны"

function groupByCountry(tours: Tour[]): Map<string, Tour[]> {
  const map = new Map<string, Tour[]>()
  for (const t of tours) {
    const key = t.country?.trim() || NO_COUNTRY
    const g = map.get(key)
    if (g) g.push(t)
    else map.set(key, [t])
  }
  return map
}

export default async function AdminToursPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>
}) {
  const { error } = await searchParams
  const [allTours, slugMaps, hiddenTourSlugs, tourTypes, countries] = await Promise.all([
    getTours(),
    getSlugMaps(),
    getHiddenTourSlugs(),
    getBusTourTypes(),
    getCountries("bus"),
  ])

  const groups = groupByCountry(allTours)
  const countryOrder = new Map(countries.map((c, i) => [c.name, i]))
  const sortedCountryNames = [...groups.keys()].sort((a, b) => {
    if (a === NO_COUNTRY) return 1
    if (b === NO_COUNTRY) return -1
    return (countryOrder.get(a) ?? 1e9) - (countryOrder.get(b) ?? 1e9)
  })

  const workspaceGroups: EditorWorkspaceGroup[] = [
    { id: "tours", label: "Туры", badge: allTours.length > 0, anchorIds: ["tours-list"] },
    { id: "types", label: "Типы автобусных туров", badge: tourTypes.length > 0, anchorIds: ["tour-types"] },
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="Автобусные туры" description={`Всего: ${allTours.length}`}>
        <ButtonLink href="/admin/tours/new">
          <Plus className="h-4 w-4" /> Новый тур
        </ButtonLink>
      </PageHeader>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-admin-danger" role="alert">
          {error}
        </div>
      ) : null}

      <EditorWorkspace groups={workspaceGroups}>
        <div id="tours-list" className="scroll-mt-4">
          {allTours.length === 0 ? (
            <EmptyState title="Туров пока нет" description="Добавьте первый тур, чтобы он появился на сайте." />
          ) : (
            <div className="space-y-4">
              {sortedCountryNames.map((country) => (
                <TourCountryGroupTable
                  key={country}
                  country={country}
                  tours={groups.get(country)!}
                  reorderAction={reorderToursAction}
                  moveAction={moveTourAction}
                  deleteAction={deleteTourAction}
                  slugMaps={slugMaps}
                  hiddenTourSlugs={[...hiddenTourSlugs]}
                />
              ))}
            </div>
          )}
        </div>

        <div id="tour-types" className="scroll-mt-4">
          <BusTourTypeManager types={tourTypes} />
        </div>
      </EditorWorkspace>
    </div>
  )
}
