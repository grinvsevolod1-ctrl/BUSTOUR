"use server"

import { revalidatePath } from "next/cache"
import { requireCapability } from "@/lib/auth"
import { writeAudit } from "@/lib/admin-audit"
import {
  createCurrency,
  updateCurrency,
  deleteCurrency,
  refreshCurrenciesFromNbrb,
  saveMarkupPercent,
  type CurrencyInput,
} from "@/lib/currencies-server"
import { mapDbError } from "@/lib/db-errors"

function currencyFromForm(formData: FormData): CurrencyInput {
  return {
    code: String(formData.get("code") || "").trim(),
    label: String(formData.get("label") || "").trim(),
    symbol: String(formData.get("symbol") || "").trim(),
    rate: Number(formData.get("rate") || 0) || 0,
    isBase: formData.get("isBase") === "on",
  }
}

type CurrencyActionState = {
  ok?: boolean
  error?: string
  success?: string
  details?: {
    updated: number
    total: number
    skipped: string[]
    asOfDates: Record<string, string>
    officialRates: Record<string, number>
    markupAmounts: Record<string, number>
    markupPercent: number
    commercialRates: Record<string, number>
  }
}

export async function saveCurrencyAction(_prev: unknown, formData: FormData): Promise<CurrencyActionState> {
  const admin = await requireCapability("manage_currencies")
  const input = currencyFromForm(formData)
  if (!input.code) {
    return { error: "Укажите код валюты (например, USD)" }
  }
  if (!input.isBase && input.rate <= 0) {
    return { error: "Курс должен быть больше нуля" }
  }
  const id = Number(formData.get("id") || 0)
  try {
    if (id) {
      await updateCurrency(id, input)
      await writeAudit({
        admin,
        action: "currency_update",
        entityType: "currency",
        entityId: id,
        summary: `Обновлена валюта ${input.code}`,
        after: { id, ...input },
      })
    } else {
      await createCurrency(input)
      await writeAudit({
        admin,
        action: "currency_create",
        entityType: "currency",
        entityId: input.code,
        summary: `Создана валюта ${input.code}`,
        after: input,
      })
    }
  } catch (err) {
    return { error: mapDbError(err, "Не удалось сохранить валюту") }
  }
  revalidatePath("/admin/currencies")
  revalidatePath("/", "layout")
  return { ok: true }
}

export async function deleteCurrencyAction(formData: FormData) {
  const admin = await requireCapability("manage_currencies")
  const id = Number(formData.get("id") || 0)
  if (id) await deleteCurrency(id)
  await writeAudit({
    admin,
    action: "currency_delete",
    entityType: "currency",
    entityId: id,
    summary: `Удалена валюта #${id}`,
  })
  revalidatePath("/admin/currencies")
  revalidatePath("/", "layout")
}

export async function refreshCurrencyRatesAction(_prev: unknown, formData: FormData): Promise<CurrencyActionState> {
  const admin = await requireCapability("manage_currencies")
  const rawMarkup = String(formData.get("markupPercent") || "0").trim()
  const markupPercent = Number(rawMarkup.replace(/,/g, "."))
  if (!Number.isFinite(markupPercent)) {
    return { error: "Введите корректный процент наценки" }
  }
  if (markupPercent < 0 || markupPercent > 100) {
    return { error: "Наценка должна быть от 0 до 100%" }
  }
  let result
  try {
    result = await refreshCurrenciesFromNbrb(markupPercent)
    await saveMarkupPercent(markupPercent)
  } catch (error) {
    console.error("NBRB currency refresh failed", error)
    return { error: "НБРБ не ответил или вернул некорректные данные. Курсы не изменены — попробуйте ещё раз." }
  }
  await writeAudit({
    admin,
    action: "currency_refresh_nbrb",
    entityType: "currency",
    entityId: "nbrb",
    summary: `Обновлены курсы по НБРБ (${result.updated} валют)`,
    after: result,
  })
  revalidatePath("/admin/currencies")
  revalidatePath("/", "layout")
  const skipped = result.skipped.length ? ` Не найдены в справочнике: ${result.skipped.join(", ")}.` : ""
  return {
    success: `Курсы обновлены по НБРБ: ${result.updated} из ${result.total}.${skipped}`,
    details: result,
  }
}
