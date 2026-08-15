"use server"

import { withAdminAction } from "@/lib/admin-action"
import {
  createCurrency,
  updateCurrency,
  deleteCurrency,
  moveCurrency,
  refreshCurrenciesFromNbrb,
  saveMarkupPercent,
  type CurrencyInput,
} from "@/lib/currencies-server"

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

const REVALIDATE = ["/admin/currencies", ["/", "layout"]] as const

export async function saveCurrencyAction(_prev: unknown, formData: FormData): Promise<CurrencyActionState> {
  const input = currencyFromForm(formData)
  if (!input.code) return { error: "Укажите код валюты (например, USD)" }
  if (!input.isBase && input.rate <= 0) return { error: "Курс должен быть больше нуля" }

  const id = Number(formData.get("id") || 0)
  return withAdminAction<CurrencyActionState>(
    { capability: "manage_currencies", errorMessage: "Не удалось сохранить валюту", revalidate: REVALIDATE },
    async () => {
      if (id) await updateCurrency(id, input)
      else await createCurrency(input)
      return {
        audit: {
          action: id ? "currency_update" : "currency_create",
          entityType: "currency",
          entityId: id || input.code,
          summary: `${id ? "Обновлена" : "Создана"} валюта ${input.code}`,
          after: id ? { id, ...input } : input,
        },
        result: { ok: true },
      }
    },
  )
}

export async function deleteCurrencyAction(formData: FormData) {
  const id = Number(formData.get("id") || 0)
  await withAdminAction(
    { capability: "manage_currencies", errorMessage: "Не удалось удалить валюту", revalidate: REVALIDATE },
    async () => {
      if (id) await deleteCurrency(id)
      return {
        audit: {
          action: "currency_delete",
          entityType: "currency",
          entityId: id,
          summary: `Удалена валюта #${id}`,
        },
      }
    },
  )
}

export async function moveCurrencyAction(formData: FormData) {
  const id = Number(formData.get("id") || 0)
  const direction = String(formData.get("direction") || "up") === "down" ? "down" : "up"
  await withAdminAction(
    { capability: "manage_currencies", errorMessage: "Не удалось переместить валюту", revalidate: REVALIDATE },
    async () => {
      if (id) await moveCurrency(id, direction)
      return {
        audit: {
          action: "currency_move",
          entityType: "currency",
          entityId: id,
          summary: `Перемещена валюта #${id} (${direction})`,
          after: { direction },
        },
      }
    },
  )
}

export async function refreshCurrencyRatesAction(_prev: unknown, formData: FormData): Promise<CurrencyActionState> {
  const rawMarkup = String(formData.get("markupPercent") || "0").trim()
  const markupPercent = Number(rawMarkup.replace(/,/g, "."))
  if (!Number.isFinite(markupPercent)) return { error: "Введите корректный процент наценки" }
  if (markupPercent < 0 || markupPercent > 100) return { error: "Наценка должна быть от 0 до 100%" }

  return withAdminAction<CurrencyActionState>(
    {
      capability: "manage_currencies",
      errorMessage: "НБРБ не ответил или вернул некорректные данные. Курсы не изменены — попробуйте ещё раз.",
      revalidate: REVALIDATE,
    },
    async () => {
      let result: Awaited<ReturnType<typeof refreshCurrenciesFromNbrb>>
      try {
        result = await refreshCurrenciesFromNbrb(markupPercent)
      } catch (err) {
        // Network/parse failures must be visible both in logs and in the action error.
        console.error("NBRB currency refresh failed", err)
        throw err
      }
      await saveMarkupPercent(markupPercent)
      const skipped = result.skipped.length ? ` Не найдены в справочнике: ${result.skipped.join(", ")}.` : ""
      return {
        audit: {
          action: "currency_refresh_nbrb",
          entityType: "currency",
          entityId: "nbrb",
          summary: `Обновлены курсы по НБРБ (${result.updated} валют)`,
          after: result,
        },
        result: {
          success: `Курсы обновлены по НБРБ: ${result.updated} из ${result.total}.${skipped}`,
          details: result,
        },
      }
    },
  )
}
