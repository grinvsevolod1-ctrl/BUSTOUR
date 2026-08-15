import Link from "next/link"
import { Plus, Pencil, Archive, ExternalLink, EyeOff } from "lucide-react"
import { getCountries } from "@/lib/countries"
import { countCitiesByCountryId } from "@/lib/cities"
import { countToursByCountryId } from "@/lib/queries"
import { getSettings } from "@/lib/cms"
import { deleteCountryAction, moveCountryAction, reorderCountriesAction } from "@/app/admin/country-actions"
import { cn } from "@/lib/utils"
import { VisibilityToggle } from "@/components/admin/visibility-toggle"
import { ConfirmActionForm } from "@/components/admin/confirm-action-form"
import { SortOrderButtons } from "@/components/admin/sort-order-buttons"
import { DragHandle } from "@/components/admin/drag-reorder-control"
import { SortableTableBody } from "@/components/admin/reorder/sortable-collections"
import { adminCountryOpenHref } from "@/lib/admin-public-href"
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

const tabs = [
  { value: "bus", label: "Автобусные" },
  { value: "avia", label: "Авиа" },
  { value: "hot", label: "Горящие" },
] as const

export default async function AdminCountriesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; error?: string; notice?: string }>
}) {
  const { category, error } = await searchParams
  const active = category === "avia" ? "avia" : category === "hot" ? "hot" : "bus"

  const [countries, settings] = await Promise.all([getCountries(active), getSettings()])
  // Tours exist only for bus catalog — skip «нет туров» on avia/hot
  const emptyFlags = Object.fromEntries(
    await Promise.all(
      countries.map(async (c) => {
        const cityCount = await countCitiesByCountryId(c.id, active)
        const noTours =
          active === "bus" ? (await countToursByCountryId(c.id)) === 0 : false
        return [c.id, { noTours, noCities: cityCount === 0 }] as const
      }),
    ),
  )
  const homeVisible =
    active === "avia"
      ? settings["aviatory.visible"] !== "0"
      : active === "hot"
      ? settings["hot.visible"] !== "0"
      : settings["bustours.visible"] !== "0"

  return (
    <div className="space-y-6">
      <PageHeader
        title="Страны"
        description={`Направления верхнего уровня · Всего: ${countries.length}`}
      >
        <ButtonLink href={`/admin/countries/new?category=${active}`}>
          <Plus className="h-4 w-4" /> Новая страна
        </ButtonLink>
      </PageHeader>

      {/* Category tabs */}
      <div className="flex gap-2 border-b border-admin-border">
        {tabs.map((tab) => (
          <Link
            key={tab.value}
            href={`/admin/countries?category=${tab.value}`}
            className={cn(
              "px-4 py-2 text-sm font-medium transition-colors",
              active === tab.value
                ? "border-b-2 border-brand text-brand"
                : "text-admin-fg-muted hover:text-admin-fg",
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {error ? (
        <div
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-admin-danger"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      {countries.length === 0 ? (
        <EmptyState
          title="Стран пока нет"
          description={
            active === "avia"
              ? "Если страна уже есть в разделе «Автобусные» — откройте её там и смените категорию на «Авиатуры»."
              : active === "hot"
              ? "Добавьте страну, чтобы она появилась в разделе горящих туров."
              : "Добавьте страну, чтобы группировать по ней туры и города."
          }
        >
          {active === "avia" ? (
            <Link
              href="/admin/countries?category=bus"
              className="mt-3 inline-block rounded-md border border-admin-border px-3 py-1.5 text-sm text-admin-fg hover:bg-admin-hover"
            >
              Перейти к автобусным странам &rarr;
            </Link>
          ) : null}
        </EmptyState>
      ) : (
        <TableWrap>
          <Thead>
            <tr>
              <Th>Страна</Th>
              <Th>Slug</Th>
              <Th actions className="sr-only">Действия</Th>
            </tr>
          </Thead>
          <SortableTableBody
            action={reorderCountriesAction}
            items={countries.map((country) => ({ id: country.id, label: country.name }))}
          >
            {countries.map((country, index) => {
              const hasVisibility = active === "avia" || active === "hot"
              const countryVisible = settings[`country:${country.category}:${country.slug}.visible`] !== "0"
              const effectivelyHidden = !countryVisible || (hasVisibility && !homeVisible)
              const empty = emptyFlags[country.id]
              return (
                <Tr key={country.id}>
                <Td>
                  <div className="flex flex-wrap items-center gap-2">
                    <DragHandle label={country.name} />
                    <SortOrderButtons
                      action={moveCountryAction}
                      id={country.id}
                      isFirst={index === 0}
                      isLast={index === countries.length - 1}
                    />
                    <span className={cn("font-medium", effectivelyHidden && "text-admin-fg-muted")}>{country.name}</span>
                    {!countryVisible && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                        <EyeOff className="h-3 w-3" />
                        Скрыта
                      </span>
                    )}
                    {hasVisibility && countryVisible && !homeVisible && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] text-amber-600">
                        <EyeOff className="h-3 w-3" />
                        Скрыт раздел
                      </span>
                    )}
                    {empty?.noCities && (
                      <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-admin-fg-muted">
                        нет городов
                      </span>
                    )}
                    {empty?.noTours && (
                      <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-admin-fg-muted">
                        нет туров
                      </span>
                    )}
                  </div>
                </Td>
                <Td className="text-admin-fg-muted">{country.slug}</Td>
                <Td actions>
                  <div className="flex items-center justify-end gap-1">
                    <IconLink
                      href={adminCountryOpenHref({
                        category: active,
                        countrySlug: country.slug,
                        aviaSlugRaw: settings["aviatory.slug"],
                        pageSlugOverride: settings[`country:${country.category}:${country.slug}.pageSlug`],
                      })}
                      target="_blank"
                      aria-label="Открыть на сайте"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </IconLink>
                    <IconLink href={`/admin/countries/${country.id}`} aria-label="Редактировать">
                      <Pencil className="h-4 w-4" />
                    </IconLink>
                    <VisibilityToggle
                      settingKey={`country:${country.category}:${country.slug}.visible`}
                      visible={countryVisible}
                      label={`страну «${country.name}»`}
                    />
                    <ConfirmActionForm
                      action={deleteCountryAction}
                      title="В архив"
                      confirmLabel="В архив"
                      message={`Перенести страну «${country.name}» в архив? Позже можно восстановить.`}
                    >
                      <input type="hidden" name="id" value={country.id} />
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
      )}
    </div>
  )
}
