"use client"

import { useTransition } from "react"
import { Archive, ExternalLink, Pencil, Play, Star, Video } from "lucide-react"
import { approveReviewAction, setReviewShowOnAction } from "@/app/admin/actions"
import { deleteReviewAction } from "@/app/admin/actions"
import { ConfirmActionForm } from "@/components/admin/confirm-action-form"
import {
  Badge,
  Button,
  Card,
  IconButton,
  IconLink,
} from "@/components/admin/ui"
import {
  REVIEW_SHOW_ON_OPTIONS,
  isVideoReview,
  parseReviewPhotoUrls,
  primaryReviewPhotoUrl,
  reviewHasLinkedTour,
  toggleShowOn,
} from "@/lib/review-admin"
import { stripPublicReviewText } from "@/lib/review-utils"
import type { Review } from "@/lib/types"
import { cn } from "@/lib/utils"

export function ReviewCard({ review }: { review: Review }) {
  const [pendingApprove, startApprove] = useTransition()
  const [pendingShow, startShow] = useTransition()
  const video = isVideoReview(review)
  const linkedTour = reviewHasLinkedTour(review)
  const photos = video ? [] : parseReviewPhotoUrls(review.thumbnailUrl)
  const videoPoster = video ? primaryReviewPhotoUrl(review.thumbnailUrl) : ""

  function handleApprove() {
    const fd = new FormData()
    fd.set("id", String(review.id))
    fd.set("approved", review.approved ? "0" : "1")
    startApprove(() => approveReviewAction(fd))
  }

  function handleShowOnToggle(key: string) {
    if (key === "tour" && !linkedTour) return
    const next = toggleShowOn(review.showOn ?? [], key)
    const fd = new FormData()
    fd.set("id", String(review.id))
    fd.set("showOn", JSON.stringify(next))
    startShow(() => setReviewShowOnAction(fd))
  }

  return (
    <Card className={cn("flex flex-col p-5", review.approved ? "" : "border-dashed opacity-90")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="break-words font-semibold text-admin-fg">{review.name}</span>
            {video ? (
              <Badge tone="blue">
                <Video className="h-3 w-3" />
                Видео
              </Badge>
            ) : (
              <Badge tone="neutral">Текст</Badge>
            )}
            {linkedTour ? <Badge tone="blue">Тур!</Badge> : null}
            {review.source === "holiday_by" ? <Badge tone="green">Holiday.by</Badge> : null}
            {!review.approved ? <Badge tone="amber">На проверке</Badge> : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {review.tour ? <span className="text-sm text-admin-fg-muted">{review.tour}</span> : null}
            {review.sourceDate ? <span className="text-xs text-admin-fg-subtle">{review.sourceDate}</span> : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <IconLink href={`/admin/reviews/${review.id}`} aria-label="Редактировать">
            <Pencil className="h-4 w-4" />
          </IconLink>
          <ConfirmActionForm
            action={deleteReviewAction}
            title="В архив"
            confirmLabel="В архив"
            message={`Перенести отзыв «${review.name}» в архив? Позже можно восстановить.`}
          >
            <input type="hidden" name="id" value={review.id} />
            <IconButton type="submit" tone="danger" aria-label="В архив">
              <Archive className="h-4 w-4" />
            </IconButton>
          </ConfirmActionForm>
        </div>
      </div>

      {!video ? (
        <div className="mt-2 flex gap-0.5" aria-label={`Рейтинг ${review.rating} из 5`}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={i < review.rating ? "h-4 w-4 fill-amber-400 text-amber-400" : "h-4 w-4 text-admin-border"}
            />
          ))}
        </div>
      ) : null}

      {video ? (
        <div className="mt-3 flex items-center gap-3 rounded-md border border-admin-border bg-admin-muted/40 p-3">
          {videoPoster ? (
            // Admin preview thumb; next/image not needed for uploads picker.
            <img
              src={videoPoster}
              alt=""
              className="h-14 w-20 shrink-0 rounded object-cover"
            />
          ) : (
            <div className="grid h-14 w-20 shrink-0 place-items-center rounded bg-admin-muted">
              <Play className="h-5 w-5 text-admin-fg-muted" />
            </div>
          )}
          <a
            href={review.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline"
          >
            Смотреть видео
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      ) : (
        <div className="mt-2 space-y-2">
          {photos.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {photos.map((src) => (
                <a
                  key={src}
                  href={src}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-fit overflow-hidden rounded border border-admin-border"
                >
                  <img src={src} alt="" className="h-20 max-w-[10rem] object-cover" />
                </a>
              ))}
            </div>
          ) : null}
          <p className="break-words text-sm leading-relaxed text-admin-fg">
            {stripPublicReviewText(review.text)}
          </p>
          {review.contactPhone ? (
            <p className="text-sm text-admin-fg-muted">
              Тел:{" "}
              <a href={`tel:${review.contactPhone.replace(/\D/g, "")}`} className="hover:underline">
                {review.contactPhone}
              </a>
            </p>
          ) : null}
        </div>
      )}

      <div className="mt-auto space-y-3 border-t border-admin-border pt-3">
        <div className="flex flex-wrap items-center gap-2">
          {review.approved ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={pendingApprove}
              onClick={handleApprove}
            >
              Снять с публикации
            </Button>
          ) : (
            <Button type="button" size="sm" disabled={pendingApprove} onClick={handleApprove}>
              Одобрить
            </Button>
          )}
          {review.approved ? <Badge tone="green">Одобрен</Badge> : null}
        </div>

        <div className="space-y-1.5">
          <div className="text-xs font-medium text-admin-fg-muted">Показывать на</div>
          <div className="flex flex-wrap gap-1.5">
            {REVIEW_SHOW_ON_OPTIONS.map(({ key, label }) => {
              const active = review.showOn?.includes(key) ?? false
              const tourLocked = key === "tour" && !linkedTour
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleShowOnToggle(key)}
                  disabled={pendingShow || tourLocked}
                  title={
                    tourLocked
                      ? "Сначала привяжите отзыв к автобусному туру"
                      : undefined
                  }
                  className={cn(
                    "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                    active
                      ? "border-brand/40 bg-brand/10 text-brand"
                      : "border-admin-border bg-white text-admin-fg-muted hover:bg-admin-muted",
                    tourLocked && "hover:bg-white",
                  )}
                >
                  {label}
                </button>
              )
            })}
          </div>
          {!linkedTour ? (
            <p className="text-xs text-admin-fg-subtle">
              «Страница тура» доступна после привязки к автобусному туру.
            </p>
          ) : null}
        </div>
      </div>
    </Card>
  )
}
