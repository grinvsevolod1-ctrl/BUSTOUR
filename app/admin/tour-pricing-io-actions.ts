"use server"

import ExcelJS from "exceljs"
import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/lib/auth"
import { writeAudit } from "@/lib/admin-audit"
import { getBusToursWithDates, saveTourDatesTable } from "@/lib/queries"
import { buildPricingWorkbook, parsePricingWorkbook, type PricingImportError } from "@/lib/pricing-excel"

const MAX_IMPORT_SIZE_BYTES = 8 * 1024 * 1024 // 8 МБ — прайс-лист в разы меньше, запас на будущее

export async function exportTourPricingAction(): Promise<
  { success: true; base64: string; filename: string } | { success: false; error: string }
> {
  await requireAdmin()
  try {
    const tours = await getBusToursWithDates()
    const workbook = buildPricingWorkbook(tours)
    const buffer = await workbook.xlsx.writeBuffer()
    const today = new Date().toISOString().slice(0, 10)
    return {
      success: true,
      base64: Buffer.from(buffer as ArrayBuffer).toString("base64"),
      filename: `bastur-czeny-turov-${today}.xlsx`,
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Не удалось сформировать файл" }
  }
}

export type ImportPricingState = {
  success: boolean
  error?: string
  updatedCount?: number
  updatedTitles?: string[]
  errors?: PricingImportError[]
} | null

export async function importTourPricingAction(_prev: ImportPricingState, formData: FormData): Promise<ImportPricingState> {
  const admin = await requireAdmin()
  const file = formData.get("file")
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: "Выберите файл .xlsx для загрузки" }
  }
  if (file.size > MAX_IMPORT_SIZE_BYTES) {
    return { success: false, error: "Файл слишком большой (максимум 8 МБ)" }
  }

  let workbook: ExcelJS.Workbook
  try {
    const arrayBuffer = await file.arrayBuffer()
    workbook = new ExcelJS.Workbook()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- exceljs types lag behind Node's Buffer generics
    await workbook.xlsx.load(Buffer.from(arrayBuffer) as any)
  } catch {
    return { success: false, error: "Не удалось прочитать файл. Убедитесь, что это .xlsx, полученный через «Скачать Excel»." }
  }

  const existingTours = await getBusToursWithDates()
  const { updates, errors } = parsePricingWorkbook(workbook, existingTours)

  const updatedTitles: string[] = []
  for (const update of updates) {
    try {
      await saveTourDatesTable(update.tourId, update.table)
      updatedTitles.push(update.tourTitle)
      revalidatePath(`/admin/tour-pricing/${update.tourId}`)
      const tour = existingTours.find((t) => t.id === update.tourId)
      if (tour?.countrySlug && tour.citySlug) {
        revalidatePath(`/avtobusnye-tury/${tour.countrySlug}/${tour.citySlug}/${tour.slug}`)
      }
    } catch (err) {
      errors.push({
        sheet: update.tourTitle,
        message: err instanceof Error ? err.message : "Не удалось сохранить даты для этого тура",
      })
    }
  }

  if (updatedTitles.length) {
    revalidatePath("/admin/tour-pricing")
    revalidatePath("/avtobusnye-tury")
    await writeAudit({
      admin,
      action: "tour_dates_bulk_import",
      entityType: "tour",
      summary: `Импорт цен из Excel: обновлено туров — ${updatedTitles.length}`,
      meta: { updatedTitles, errorCount: errors.length },
    })
  }

  return {
    success: updatedTitles.length > 0,
    error: updatedTitles.length === 0 ? errors[0]?.message || "Не удалось обновить ни один тур" : undefined,
    updatedCount: updatedTitles.length,
    updatedTitles,
    errors,
  }
}
