"use client"

import { useState } from "react"
import { ChevronDown, Pencil, Archive, ExternalLink, EyeOff } from "lucide-react"
import { cn } from "@/lib/utils"
import type { CityDestination, SiteSettings } from "@/lib/types"
import { VisibilityToggle } from "@/components/admin/visibility-toggle"
import { ConfirmActionForm } from "@/components/admin/confirm-action-form"
import { SortOrderButtons } from "@/components/admin/sort-order-buttons"
import { DragHandle } from "@/components/admin/drag-reorder-control"
import { SortableTableBody } from "@/components/admin/reorder/sortable-collections"
import { adminCityOpenHref } from "@/lib/admin-public-href"
import { TableWrap, Td, Th, Thead, Tr, IconButton, IconLink } from "@/components/admin/ui"

type ActionFn = (f: FormData) => void | Promise<void>

export function CountryGroupTable({
  country,
  cities,
  reorderAction,
  moveAction,
  deleteAction,
  settings,
  countrySlugById,
  countrySlugByName,
  homeVisible,
  tourCountByCityId = {},
}: {
  country: string
  cities: CityDestination[]
  reorderAction: ActionFn
  moveAction: ActionFn
  deleteAction: ActionFn
  settings: SiteSettings
  countrySlugById: Record<number, string>
  countrySlugByName: Record<string, string>
  homeVisible: boolean
  tourCountByCityId?: Record<number, number>
}) {
  const [open, setOpen] = useState(true)

  return (
    <div className="rounded-lg border border-admin-border bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 bg-slate-50/80 px-4 py-3 text-left hover:bg-slate-100/80 transition-colors"
        aria-expanded={open}
      >
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-admin-fg-subtle transition-transform duration-150",
            open && "rotate-180",
          )}
        />
        <span className="text-sm font-semibold text-admin-fg">{country}</span>
        <span className="text-xs text-admin-fg-muted">({cities.length})</span>
      </button>

      {open && (
        <div className="border-t border-admin-border">
          <TableWrap>
            <Thead>
              <Tr>
                <Th actions>Порядок</Th>
                <Th>Город</Th>
                <Th>Секций</Th>
                <Th actions className="sr-only">
                  Действия
                </Th>
              </Tr>
            </Thead>
            <SortableTableBody
              action={reorderAction}
              items={cities.map((c) => ({ id: c.id, label: c.name }))}
            >
              {cities.map((city, index) => {
                const hasVis = settings[`city:${city.category}:${city.slug}.visible`] !== undefined
                const cityVis = hasVis ? settings[`city:${city.category}:${city.slug}.visible`] !== "0" : true
                const countryVis =
                  !city.country ||
                  settings[`country:${city.category}:${countrySlugByName[city.country] ?? "_"}.visible`] !== "0"
                const effHidden = !cityVis || !homeVisible || (!countryVis && hasVis)

                return (
                  <Tr key={city.id}>
                    <Td actions>
                      <div className="flex items-center gap-2">
                        <DragHandle label={city.name} />
                        <SortOrderButtons action={moveAction} id={city.id} isFirst={index === 0} isLast={index === cities.length - 1} />
                      </div>
                    </Td>
                    <Td>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={cn("font-medium", effHidden && "text-admin-fg-muted")}>{city.name}</span>
                        {!cityVis && <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700"><EyeOff className="h-3 w-3" />Скрыт</span>}
                        {hasVis && cityVis && !homeVisible && <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] text-amber-600"><EyeOff className="h-3 w-3" />Скрыт раздел</span>}
                        {hasVis && cityVis && homeVisible && !countryVis && <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] text-amber-600"><EyeOff className="h-3 w-3" />Скрыта страна</span>}
                        {city.category === "bus" && (tourCountByCityId[city.id] ?? 0) === 0 && (
                          <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-admin-fg-muted">
                            нет туров
                          </span>
                        )}
                      </div>
                    </Td>
                    <Td className="w-[80px] text-admin-fg-muted">{city.sections.length}</Td>
                    <Td actions>
                      <div className="flex items-center justify-end gap-1">
                        <IconLink href={adminCityOpenHref({ category: city.category as "bus" | "avia" | "hot", countrySlug: countrySlugById[city.countryId] ?? countrySlugByName[city.country] ?? "_", citySlug: city.slug, aviaSlugRaw: settings["aviatory.slug"] })} target="_blank" aria-label="Открыть на сайте"><ExternalLink className="h-4 w-4" /></IconLink>
                        <IconLink href={`/admin/cities/${city.id}`} aria-label="Редактировать"><Pencil className="h-4 w-4" /></IconLink>
                        <VisibilityToggle settingKey={`city:${city.category}:${city.slug}.visible`} visible={cityVis} label={`город «${city.name}»`} />
                        <ConfirmActionForm action={deleteAction} title="В архив" confirmLabel="В архив" message={`Перенести город «${city.name}» в архив? Позже можно восстановить.`}>
                          <input type="hidden" name="id" value={city.id} />
                          <IconButton type="submit" tone="danger" aria-label="В архив"><Archive className="h-4 w-4" /></IconButton>
                        </ConfirmActionForm>
                      </div>
                    </Td>
                  </Tr>
                )
              })}
            </SortableTableBody>
          </TableWrap>
        </div>
      )}
    </div>
  )
}