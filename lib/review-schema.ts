import { z } from "zod"

// Single Table Inheritance validation for the `reviews` table (see lib/db/schema.ts).
// Discriminated on `type`: 'TEXT' reviews need name/rating/text, 'VIDEO' reviews need
// name + video + thumbnail (URLs — see components/admin/media-uploader.tsx).
const tourField = z.string().trim().default("")

// FormData may send "" / null when the field is absent; coerce then fails min(1).
const ratingField = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? 5 : v),
  z.coerce.number().int().min(1).max(5),
)

export const textReviewSchema = z.object({
  type: z.literal("TEXT"),
  tour: tourField,
  name: z.string().trim().min(1, "Заполните имя"),
  rating: ratingField,
  text: z.string().trim().min(1, "Добавьте текст отзыва"),
  /** One URL or JSON array of URLs (see parseReviewPhotoUrls). */
  thumbnailUrl: z.string().trim().default(""),
})

export const videoReviewSchema = z.object({
  type: z.literal("VIDEO"),
  tour: tourField,
  name: z.string().trim().min(1, "Заполните название / имя"),
  rating: ratingField,
  text: z.string().trim().default(""),
  videoUrl: z.string().trim().min(1, "Загрузите видео"),
  thumbnailUrl: z.string().trim().min(1, "Загрузите миниатюру"),
})

export const reviewInputSchema = z.discriminatedUnion("type", [textReviewSchema, videoReviewSchema])

export type ReviewFormInput = z.infer<typeof reviewInputSchema>
