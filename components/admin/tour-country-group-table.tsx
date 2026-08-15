"use client"

import { useMemo, useState } from "react"
import { ChevronDown, Pencil, Archive, ExternalLink, EyeOff } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Tour } from "@/lib/types"
import { VisibilityToggle } from "@/components/admin/visibility-toggle"
import { ConfirmActionForm } from "@/components/admin/confirm-action-form"
import { SortOrderButtons } from "@/components/admin/sort-order-buttons"
import { DragHandle } from "@/components/admin/drag-reorder-control"
import { SortableTableBody } from "@/components/admin/reorder/sortable-collections"
import { tourUrl } from "@/lib/tour-url"
import { TableWrap, Td, Th, Thead, Tr, IconButton, IconLink } from "@/components/admin/ui"

type ActionFn = (f: FormData) => void | Promise<void>
type SlugMaps = { countrySlugById: Record<number, string>; citySlugById: Record<number, string> }

export function TourCountryGroupTable({
  country,
  tours,
  reorderAction,
  moveAction,
  deleteAction,
  slugMaps,
  hiddenTourSlugs,
}: {
  country: string
  tours: Tour[]
  reorderAction: ActionFn
  moveAction: ActionFn
  deleteAction: ActionFn
  slugMaps: SlugMaps
  /** Slugs with CMS visibility off */
  hiddenTourSlugs: string[]
}) {
  const [open, setOpen] = useState(true)
  const hiddenSet = useMemo(() => new Set(hiddenTourSlugs), [hiddenTourSlugs])

  return (
    <div className="overflow-hidden rounded-lg border border-admin-border bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 bg-slate-50/80 px-4 py-3 text-left transition-colors hover:bg-slate-100/80"
        aria-expanded={open}
      >
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-admin-fg-subtle transition-transform duration-150",
            open && "rotate-180",
          )}
        />
        <span className="text-sm font-semibold text-admin-fg">{country}</span>
        <span className="text-xs text-admin-fg-muted">({tours.length})</span>
      </button>

      {open && (
        <div className="border-t border-admin-border">
          <TableWrap>
            <Thead>
              <Tr>
                <Th actions>Порядок</Th>
                <Th>Тур</Th>
                <Th>Цена</Th>
                <Th>Избранное</Th>
                <Th actions className="sr-only">
                  Действия
                </Th>
              </Tr>
            </Thead>
            <SortableTableBody
              action={reorderAction}
              items={tours.map((t) => ({ id: t.id, label: t.title }))}
            >
              {tours.map((tour, index) => {
                const hidden = hiddenSet.has(tour.slug)
                const siteUrl = tourUrl({
                  tourSlug: tour.slug,
                  countrySlug: slugMaps.countrySlugById[tour.countryId],
                  citySlug: slugMaps.citySlugById[tour.arrivalCityId],
                })
                return (
                  <Tr key={tour.id}>
                    <Td actions>
                      <div className="flex items-center gap-2">
                        <DragHandle label={tour.title} />
                        <SortOrderButtons
                          action={moveAction}
                          id={tour.id}
                          isFirst={index === 0}
                          isLast={index === tours.length - 1}
                        />
                      </div>
                    </Td>
                    <Td>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={cn("font-medium", hidden && "text-admin-fg-muted")}>{tour.title}</span>
                        {hidden && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                            <EyeOff className="h-3 w-3" />
                            Скрыт
                          </span>
                        )}
                      </div>
                    </Td>
                    <Td className="whitespace-nowrap">{tour.price}</Td>
                    <Td className="text-admin-fg-muted">{tour.featured ? "Да" : "—"}</Td>
                    <Td actions>
                      <div className="flex items-center justify-end gap-1">
                        {siteUrl ? (
                          <IconLink href={siteUrl} target="_blank" aria-label="Открыть на сайте">
                            <ExternalLink className="h-4 w-4" />
                          </IconLink>
                        ) : null}
                        <IconLink href={`/admin/tours/${tour.id}`} aria-label="Редактировать">
                          <Pencil className="h-4 w-4" />
                        </IconLink>
                        <VisibilityToggle
                          settingKey={`tour:${tour.slug}.visible`}
                          visible={!hidden}
                          label={`тур «${tour.title}»`}
                        />
                        <ConfirmActionForm
                          action={deleteAction}
                          title="В архив"
                          confirmLabel="В архив"
                          message={`Перенести тур «${tour.title}» в архив? Позже можно восстановить.`}
                        >
                          <input type="hidden" name="id" value={tour.id} />
                          <IconButton type="submit" tone="danger" aria-label="В архив">
                            <Archive className="h-4 w-4" />
                          </IconButton>
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
