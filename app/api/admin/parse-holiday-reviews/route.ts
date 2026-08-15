import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { writeAudit } from "@/lib/admin-audit"
import { parseHolidayReviewsHtml } from "@/lib/holiday-reviews"
import { getReviews, createReview } from "@/lib/queries"

const HOLIDAY_URL = "https://www.holiday.by/agencies/bustour/opinions"

export async function POST() {
  const admin = await requireAdmin().catch(() => null)
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let html: string
  try {
    const res = await fetch(HOLIDAY_URL, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      next: { revalidate: 0 },
    })
    html = await res.text()
  } catch {
    return NextResponse.json({ error: "Не удалось загрузить страницу holiday.by" }, { status: 502 })
  }

  const parsed = parseHolidayReviewsHtml(html)
  if (!parsed.length) {
    return NextResponse.json({
      error: "Отзывы не найдены — возможно изменилась структура страницы",
      imported: 0,
    })
  }

  const existing = await getReviews()
  const existingSourceIds = new Set(
    existing.filter((r) => r.source === "holiday_by").map((r) => r.sourceId),
  )

  let imported = 0
  let skipped = 0

  for (const row of parsed) {
    if (existingSourceIds.has(row.sourceId)) {
      skipped++
      continue
    }

    await createReview({
      type: "TEXT",
      name: row.name,
      tour: "",
      text: row.text,
      rating: 5,
      source: "holiday_by",
      sourceId: row.sourceId,
      sourceDate: row.date,
      approved: false,
      showOn: [],
    })
    existingSourceIds.add(row.sourceId)
    imported++
  }

  await writeAudit({
    admin,
    action: "review_import",
    entityType: "review",
    summary: `Импорт отзывов holiday.by: +${imported}, пропущено ${skipped}`,
    after: { imported, skipped, total: parsed.length },
  })

  return NextResponse.json({ imported, skipped, total: parsed.length })
}
