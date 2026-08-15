"use client"

import { startTransition, useActionState, useEffect, useRef, useState } from "react"
import { Star } from "lucide-react"
import { toast } from "sonner"
import { saveReviewAction } from "@/app/admin/actions"
import { reviewInputSchema } from "@/lib/review-schema"
import {
  parseReviewPhotoUrls,
  serializeReviewPhotoUrls,
} from "@/lib/review-admin"
import type { Review } from "@/lib/types"
import { MediaUploader, uploadedFileFromUrl, type UploadedFile } from "@/components/admin/media-uploader"
import { AdminCombobox } from "@/components/admin/combobox"
import { useActionToast } from "@/components/admin/use-action-toast"
import { Card, CardHeader, CardTitle, CardBody, Button, ButtonLink, Input, Textarea, Label } from "@/components/admin/ui"
import { cn } from "@/lib/utils"

type ReviewType = "TEXT" | "VIDEO"

const LIST_HREF = "/admin/reviews#reviews-list"

function StarRatingInput({ value, onChange }: { value: number; onChange: (next: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      <input type="hidden" name="rating" value={value} />
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          aria-label={`Оценка ${n}`}
          className="p-0.5"
        >
          <Star className={cn("h-5 w-5", n <= value ? "fill-amber-400 text-amber-400" : "text-admin-border")} />
        </button>
      ))}
    </div>
  )
}

export function ReviewForm({ review, tourTitles = [] }: { review?: Review; tourTitles?: string[] }) {
  const [state, action, pending] = useActionState(saveReviewAction, null)
  const formRef = useRef<HTMLFormElement>(null)
  const [clientError, setClientError] = useState<string | null>(null)
  const [type, setType] = useState<ReviewType>(review?.type ?? "TEXT")
  const [tour, setTour] = useState(review?.tour ?? "")
  const [rating, setRating] = useState(review?.rating ?? 5)
  const [video, setVideo] = useState<UploadedFile | null>(review?.videoUrl ? uploadedFileFromUrl(review.videoUrl) : null)
  const [thumbnail, setThumbnail] = useState<UploadedFile | null>(
    review?.type === "VIDEO" && review.thumbnailUrl ? uploadedFileFromUrl(review.thumbnailUrl) : null,
  )
  const [photos, setPhotos] = useState<UploadedFile[]>(() =>
    review?.type !== "VIDEO"
      ? parseReviewPhotoUrls(review?.thumbnailUrl).map((url) => uploadedFileFromUrl(url))
      : [],
  )
  const tourOptions = tourTitles.map((title, i) => ({ id: i + 1, name: title }))
  const photoUrlsValue =
    type === "VIDEO" ? thumbnail?.url ?? "" : serializeReviewPhotoUrls(photos.map((p) => p.url))

  useActionToast(state, {
    successMessage: review ? "Отзыв сохранён" : "Отзыв добавлен",
  })

  useEffect(() => {
    if (state && "success" in state && state.success) {
      formRef.current?.reset()
      setType("TEXT")
      setTour("")
      setRating(5)
      setVideo(null)
      setThumbnail(null)
      setPhotos([])
      if (!review) window.location.hash = "reviews-list"
    }
  }, [state, review])

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const fd = new FormData(event.currentTarget)
    const parsed = reviewInputSchema.safeParse({
      type,
      tour: String(fd.get("tour") || ""),
      name: String(fd.get("name") || ""),
      rating: fd.get("rating") || 5,
      text: String(fd.get("text") || ""),
      videoUrl: video?.url ?? "",
      thumbnailUrl: photoUrlsValue,
    })
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Проверьте заполнение полей"
      setClientError(message)
      toast.error(message)
      return
    }
    setClientError(null)
    startTransition(() => {
      action(fd)
    })
  }

  const error = clientError ?? (state && "error" in state ? state.error : null)

  return (
    <Card>
      <CardHeader>
        <CardTitle>{review ? "Редактировать отзыв" : "Добавить отзыв"}</CardTitle>
      </CardHeader>
      <CardBody>
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
          {review ? <input type="hidden" name="id" value={review.id} /> : null}
          <input type="hidden" name="type" value={type} />
          <input type="hidden" name="videoUrl" value={video?.url ?? ""} />
          <input type="hidden" name="thumbnailUrl" value={photoUrlsValue} />

          {error ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-admin-danger" role="alert">
              {error}
            </p>
          ) : null}

          <div className="inline-flex rounded-md border border-admin-border bg-admin-muted p-1">
            {(["TEXT", "VIDEO"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={cn(
                  "rounded px-3 py-1.5 text-sm font-medium transition-colors",
                  type === t ? "bg-white text-admin-fg shadow-sm" : "text-admin-fg-muted hover:text-admin-fg",
                )}
              >
                {t === "TEXT" ? "Текстовый" : "Видео"}
              </button>
            ))}
          </div>

          <div>
            <Label>Тур (автобусный)</Label>
            <AdminCombobox
              name="tour"
              options={tourOptions}
              value={tour}
              onChange={setTour}
              placeholder="Начните вводить название автобусного тура…"
              hint="Только автобусные туры. Без привязки нельзя включить показ на «Странице тура»."
            />
          </div>

          {type === "TEXT" ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="name" required>Имя</Label>
                  <Input id="name" name="name" defaultValue={review?.name} required />
                </div>
                <div>
                  <Label>Оценка</Label>
                  <StarRatingInput value={rating} onChange={setRating} />
                </div>
              </div>
              <div>
                <Label htmlFor="text" required>Текст отзыва</Label>
                <Textarea id="text" name="text" defaultValue={review?.text} rows={3} required />
              </div>
              <MediaUploader
                mode="multiple"
                label="Фото"
                accept={["image"]}
                value={photos}
                onChange={setPhotos}
              />
              <p className="text-xs text-admin-fg-subtle">Можно добавить несколько фото. Порядок — перетаскиванием.</p>
            </>
          ) : (
            <div className="space-y-4">
              <div>
                <Label htmlFor="name" required>Название / имя</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={review?.name}
                  placeholder="Анна или «Отдых в Карелии»"
                  required
                />
              </div>
              <input type="hidden" name="rating" value={5} />
              <div className="grid gap-4 sm:grid-cols-2">
                <MediaUploader label="Видео" accept={["video"]} value={video} onChange={setVideo} />
                <MediaUploader label="Миниатюра" accept={["image"]} value={thumbnail} onChange={setThumbnail} />
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <Button type="submit" disabled={pending}>
              {pending ? "Сохранение…" : review ? "Сохранить" : "Добавить"}
            </Button>
            {review ? (
              <ButtonLink href={LIST_HREF} variant="secondary">
                Отмена
              </ButtonLink>
            ) : null}
          </div>
        </form>
      </CardBody>
    </Card>
  )
}
