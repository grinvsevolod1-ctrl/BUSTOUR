import { notFound } from "next/navigation"
import { getReviews, getBusTours } from "@/lib/queries"
import { ReviewForm } from "@/components/admin/review-form"

export default async function EditReviewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [reviews, tours] = await Promise.all([getReviews(), getBusTours()])
  const review = reviews.find((r) => r.id === Number(id))
  if (!review) notFound()

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink">Редактирование отзыва</h1>
      <ReviewForm review={review} tourTitles={tours.map((t) => t.title)} />
    </div>
  )
}
