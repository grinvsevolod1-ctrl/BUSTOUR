"use client"

import { useMemo, useState } from "react"
import { ReviewCard } from "@/components/admin/review-card"
import { EmptyState, Label, Select } from "@/components/admin/ui"
import {
  DEFAULT_REVIEW_LIST_FILTERS,
  REVIEW_SHOW_ON_OPTIONS,
  filterAndSortReviews,
  type ReviewListFilters,
} from "@/lib/review-admin"
import type { Review } from "@/lib/types"

export function ReviewsListPanel({ reviews }: { reviews: Review[] }) {
  const [filters, setFilters] = useState<ReviewListFilters>(DEFAULT_REVIEW_LIST_FILTERS)

  const visible = useMemo(() => filterAndSortReviews(reviews, filters), [reviews, filters])

  function patch(partial: Partial<ReviewListFilters>) {
    setFilters((prev) => ({ ...prev, ...partial }))
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-lg border border-admin-border bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Label htmlFor="reviews-sort">Сортировка</Label>
          <Select
            id="reviews-sort"
            value={filters.sort}
            onChange={(event) => patch({ sort: event.target.value as ReviewListFilters["sort"] })}
          >
            <option value="newest">Сначала новые</option>
            <option value="oldest">Сначала старые</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="reviews-status">Статус</Label>
          <Select
            id="reviews-status"
            value={filters.status}
            onChange={(event) => patch({ status: event.target.value as ReviewListFilters["status"] })}
          >
            <option value="all">Все</option>
            <option value="pending">На проверке</option>
            <option value="approved">Одобрен</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="reviews-kind">Тип</Label>
          <Select
            id="reviews-kind"
            value={filters.kind}
            onChange={(event) => patch({ kind: event.target.value as ReviewListFilters["kind"] })}
          >
            <option value="all">Все</option>
            <option value="text">Текст</option>
            <option value="video">Видео</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="reviews-showon">Место вывода</Label>
          <Select
            id="reviews-showon"
            value={filters.showOn}
            onChange={(event) => patch({ showOn: event.target.value as ReviewListFilters["showOn"] })}
          >
            <option value="all">Все</option>
            {REVIEW_SHOW_ON_OPTIONS.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <p className="text-xs text-admin-fg-subtle">
        Показано: {visible.length} из {reviews.filter((r) => !r.archived).length}
      </p>

      {visible.length === 0 ? (
        <EmptyState title="Ничего не найдено" description="Сбросьте фильтры или добавьте отзыв." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {visible.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      )}
    </div>
  )
}
