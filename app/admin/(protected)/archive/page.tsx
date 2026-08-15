import { ArchiveRestore, Trash2 } from "lucide-react"
import { getArchivedPages } from "@/lib/queries"
import { generatePreviewUrl } from "@/lib/preview-url"
import type { PreviewEntityType } from "@/lib/preview-token"
import {
  restoreTourAction,
  purgeTourAction,
  restoreArticleAction,
  purgeArticleAction,
  restoreBusAction,
  purgeBusAction,
  restoreReviewAction,
  purgeReviewAction,
  restoreTransferAction,
  purgeTransferAction,
  restoreLeadAction,
  purgeLeadAction,
} from "@/app/admin/actions"
import { restoreCityAction, purgeCityAction } from "@/app/admin/city-actions"
import { restoreCountryAction, purgeCountryAction } from "@/app/admin/country-actions"
import { restoreStaffAction, purgeStaffAction } from "@/app/admin/staff-actions"
import { ConfirmActionForm } from "@/components/admin/confirm-action-form"
import { ArchivePreviewButton } from "@/components/admin/preview-modal"
import {
  PageHeader,
  TableWrap,
  Thead,
  Th,
  Tbody,
  Td,
  Tr,
  Button,
  IconButton,
  EmptyState,
  Badge,
} from "@/components/admin/ui"

const categoryLabel: Record<string, string> = {
  bus: "Автобусные",
  avia: "Авиа",
  hot: "Горящие",
}

function ArchiveRowActions({
  id,
  label,
  previewUrl,
  restoreAction,
  purgeAction,
}: {
  id: number
  label: string
  previewUrl?: string | null
  restoreAction: (formData: FormData) => void | Promise<void>
  purgeAction: (formData: FormData) => void | Promise<void>
}) {
  return (
    <div className="flex items-center justify-end gap-1">
      <ArchivePreviewButton url={previewUrl} label={label} />
      <form action={restoreAction}>
        <input type="hidden" name="id" value={id} />
        <Button type="submit" variant="secondary" size="sm">
          <ArchiveRestore className="h-3.5 w-3.5" />
          Восстановить
        </Button>
      </form>
      <ConfirmActionForm
        action={purgeAction}
        title="Удалить навсегда"
        confirmLabel="Удалить навсегда"
        message={`Удалить «${label}» навсегда? Действие необратимо.`}
      >
        <input type="hidden" name="id" value={id} />
        <IconButton type="submit" tone="danger" aria-label="Удалить навсегда">
          <Trash2 className="h-4 w-4" />
        </IconButton>
      </ConfirmActionForm>
    </div>
  )
}

async function previewMap(
  type: PreviewEntityType,
  ids: number[],
): Promise<Map<number, string>> {
  const entries = await Promise.all(
    ids.map(async (id) => {
      const url = await generatePreviewUrl(type, id)
      return url ? ([id, url] as const) : null
    }),
  )
  return new Map(entries.filter((entry): entry is readonly [number, string] => Boolean(entry)))
}

/** Always fresh after restore/purge redirects (`?notice=` / `?error=`). */
export const dynamic = "force-dynamic"

export default async function AdminArchivePage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; error?: string }>
}) {
  // Touch searchParams so Turbopack/RSC cannot serve a stale archive table after mutations.
  await searchParams
  const { tours, articles, cities, countries, buses, reviews, staff, transfers, leads } =
    await getArchivedPages()
  const total =
    tours.length +
    articles.length +
    cities.length +
    countries.length +
    buses.length +
    reviews.length +
    staff.length +
    transfers.length +
    leads.length

  const [tourPreviews, articlePreviews, cityPreviews, countryPreviews, busPreviews, transferPreviews] =
    await Promise.all([
      previewMap(
        "tour",
        tours.map((t) => t.id),
      ),
      previewMap(
        "article",
        articles.map((a) => a.id),
      ),
      previewMap(
        "city",
        cities.map((c) => c.id),
      ),
      previewMap(
        "country",
        countries.map((c) => c.id),
      ),
      previewMap(
        "bus",
        buses.map((b) => b.id),
      ),
      previewMap(
        "transfer",
        transfers.map((t) => t.id),
      ),
    ])

  return (
    <div className="space-y-8">
      <PageHeader title="Архив" description={`Записей: ${total}`} />

      {total === 0 ? (
        <EmptyState
          title="Архив пуст"
          description="Архивные записи появятся здесь."
        />
      ) : null}

      {tours.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-admin-fg">Туры · {tours.length}</h2>
          <TableWrap>
            <Thead>
              <tr>
                <Th>Название</Th>
                <Th>Slug</Th>
                <Th actions className="sr-only">Действия</Th>
              </tr>
            </Thead>
            <Tbody>
              {tours.map((tour) => (
                <Tr key={`tour-${tour.id}`}>
                  <Td className="font-medium">{tour.title}</Td>
                  <Td className="text-admin-fg-muted">{tour.slug}</Td>
                  <Td actions>
                    <ArchiveRowActions
                      id={tour.id}
                      label={tour.title}
                      previewUrl={tourPreviews.get(tour.id)}
                      restoreAction={restoreTourAction}
                      purgeAction={purgeTourAction}
                    />
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </TableWrap>
        </section>
      ) : null}

      {articles.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-admin-fg">Статьи · {articles.length}</h2>
          <TableWrap>
            <Thead>
              <tr>
                <Th>Заголовок</Th>
                <Th>Slug</Th>
                <Th actions className="sr-only">Действия</Th>
              </tr>
            </Thead>
            <Tbody>
              {articles.map((article) => (
                <Tr key={`article-${article.id}`}>
                  <Td className="font-medium">{article.title}</Td>
                  <Td className="text-admin-fg-muted">{article.slug}</Td>
                  <Td actions>
                    <ArchiveRowActions
                      id={article.id}
                      label={article.title}
                      previewUrl={articlePreviews.get(article.id)}
                      restoreAction={restoreArticleAction}
                      purgeAction={purgeArticleAction}
                    />
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </TableWrap>
        </section>
      ) : null}

      {cities.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-admin-fg">Города · {cities.length}</h2>
          <TableWrap>
            <Thead>
              <tr>
                <Th>Название</Th>
                <Th>Раздел</Th>
                <Th actions className="sr-only">Действия</Th>
              </tr>
            </Thead>
            <Tbody>
              {cities.map((city) => (
                <Tr key={`city-${city.id}`}>
                  <Td className="font-medium">{city.name}</Td>
                  <Td>
                    <Badge tone="blue">{categoryLabel[city.category] ?? city.category}</Badge>
                  </Td>
                  <Td actions>
                    <ArchiveRowActions
                      id={city.id}
                      label={city.name}
                      previewUrl={cityPreviews.get(city.id)}
                      restoreAction={restoreCityAction}
                      purgeAction={purgeCityAction}
                    />
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </TableWrap>
        </section>
      ) : null}

      {countries.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-admin-fg">Страны · {countries.length}</h2>
          <TableWrap>
            <Thead>
              <tr>
                <Th>Название</Th>
                <Th>Раздел</Th>
                <Th actions className="sr-only">Действия</Th>
              </tr>
            </Thead>
            <Tbody>
              {countries.map((country) => (
                <Tr key={`country-${country.id}`}>
                  <Td className="font-medium">{country.name}</Td>
                  <Td>
                    <Badge tone="blue">{categoryLabel[country.category] ?? country.category}</Badge>
                  </Td>
                  <Td actions>
                    <ArchiveRowActions
                      id={country.id}
                      label={country.name}
                      previewUrl={countryPreviews.get(country.id)}
                      restoreAction={restoreCountryAction}
                      purgeAction={purgeCountryAction}
                    />
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </TableWrap>
        </section>
      ) : null}

      {buses.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-admin-fg">Автобусы · {buses.length}</h2>
          <TableWrap>
            <Thead>
              <tr>
                <Th>Название</Th>
                <Th>Slug</Th>
                <Th actions className="sr-only">Действия</Th>
              </tr>
            </Thead>
            <Tbody>
              {buses.map((bus) => (
                <Tr key={`bus-${bus.id}`}>
                  <Td className="font-medium">{bus.title}</Td>
                  <Td className="text-admin-fg-muted">{bus.slug}</Td>
                  <Td actions>
                    <ArchiveRowActions
                      id={bus.id}
                      label={bus.title}
                      previewUrl={busPreviews.get(bus.id)}
                      restoreAction={restoreBusAction}
                      purgeAction={purgeBusAction}
                    />
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </TableWrap>
        </section>
      ) : null}

      {reviews.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-admin-fg">Отзывы · {reviews.length}</h2>
          <TableWrap>
            <Thead>
              <tr>
                <Th>Автор</Th>
                <Th>Тип</Th>
                <Th actions className="sr-only">Действия</Th>
              </tr>
            </Thead>
            <Tbody>
              {reviews.map((review) => (
                <Tr key={`review-${review.id}`}>
                  <Td className="font-medium">{review.name || "—"}</Td>
                  <Td className="text-admin-fg-muted">{review.type}</Td>
                  <Td actions>
                    <ArchiveRowActions
                      id={review.id}
                      label={review.name || "отзыв"}
                      restoreAction={restoreReviewAction}
                      purgeAction={purgeReviewAction}
                    />
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </TableWrap>
        </section>
      ) : null}

      {staff.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-admin-fg">Сотрудники · {staff.length}</h2>
          <TableWrap>
            <Thead>
              <tr>
                <Th>Имя</Th>
                <Th>Должность</Th>
                <Th actions className="sr-only">Действия</Th>
              </tr>
            </Thead>
            <Tbody>
              {staff.map((member) => (
                <Tr key={`staff-${member.id}`}>
                  <Td className="font-medium">{member.name}</Td>
                  <Td className="text-admin-fg-muted">{member.position || "—"}</Td>
                  <Td actions>
                    <ArchiveRowActions
                      id={member.id}
                      label={member.name}
                      restoreAction={restoreStaffAction}
                      purgeAction={purgeStaffAction}
                    />
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </TableWrap>
        </section>
      ) : null}

      {transfers.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-admin-fg">Трансферы · {transfers.length}</h2>
          <TableWrap>
            <Thead>
              <tr>
                <Th>Название</Th>
                <Th>Slug</Th>
                <Th actions className="sr-only">Действия</Th>
              </tr>
            </Thead>
            <Tbody>
              {transfers.map((transfer) => (
                <Tr key={`transfer-${transfer.id}`}>
                  <Td className="font-medium">{transfer.title}</Td>
                  <Td className="text-admin-fg-muted">{transfer.slug}</Td>
                  <Td actions>
                    <ArchiveRowActions
                      id={transfer.id}
                      label={transfer.title}
                      previewUrl={transferPreviews.get(transfer.id)}
                      restoreAction={restoreTransferAction}
                      purgeAction={purgeTransferAction}
                    />
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </TableWrap>
        </section>
      ) : null}

      {leads.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-admin-fg">Заявки · {leads.length}</h2>
          <TableWrap>
            <Thead>
              <tr>
                <Th>Имя</Th>
                <Th>Телефон</Th>
                <Th actions className="sr-only">Действия</Th>
              </tr>
            </Thead>
            <Tbody>
              {leads.map((lead) => (
                <Tr key={`lead-${lead.id}`}>
                  <Td className="font-medium">{lead.name}</Td>
                  <Td className="text-admin-fg-muted">{lead.phone}</Td>
                  <Td actions>
                    <ArchiveRowActions
                      id={lead.id}
                      label={lead.name}
                      restoreAction={restoreLeadAction}
                      purgeAction={purgeLeadAction}
                    />
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </TableWrap>
        </section>
      ) : null}
    </div>
  )
}
