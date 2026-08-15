import type { DatesTable } from "@/lib/types"
import { deriveDuration, deriveNights, hasDatesTable, minTablePrice } from "@/lib/dates-table"

const HINT_ATTACHED =
  "Данные подтягиваются из прикреплённой таблицы. Заполните поле, только если хотите жестко переопределить это значение."
const HINT_DETACHED =
  "Таблица дат не прикреплена. Значение нужно указать вручную, иначе на сайте оно выводиться не будет."

export type TourAdditionalFieldUi = {
  placeholder: string
  hint: string
}

export type TourAdditionalUi = {
  hasTable: boolean
  badge: { label: string; tone: "green" | "amber" }
  action: { label: string; href: string } | null
  price: TourAdditionalFieldUi
  duration: TourAdditionalFieldUi
  nights: TourAdditionalFieldUi
  priceRequired: boolean
}

function firstDatedRow(table: DatesTable) {
  return table.rows.find((row) => deriveDuration(row.startDate, row.endDate))
}

function fromTablePlaceholder(value: string | number | null | undefined, fallback = "Значение из таблицы…"): string {
  if (value == null) return fallback
  const text = String(value).trim()
  return text ? `Из таблицы: ${text}` : fallback
}

/** Admin «Дополнительно»: placeholders / hints / CTA from dates-table link status. */
export function buildTourAdditionalUi(input: {
  tourId?: number
  table: DatesTable
}): TourAdditionalUi {
  const hasTable = hasDatesTable(input.table)
  const row = firstDatedRow(input.table)
  const minPrice = minTablePrice(input.table)
  const duration = row ? deriveDuration(row.startDate, row.endDate) : ""
  const nights = row ? deriveNights(row.startDate, row.endDate) : null

  const action =
    input.tourId && input.tourId > 0
      ? {
          label: hasTable ? "Редактировать прикреплённую таблицу" : "Создать таблицу дат",
          href: `/admin/tour-pricing/${input.tourId}`,
        }
      : null

  if (!hasTable) {
    return {
      hasTable: false,
      badge: { label: "Таблица не прикреплена", tone: "amber" },
      action,
      price: { placeholder: "Например: 1500", hint: HINT_DETACHED },
      duration: { placeholder: "Например: 3 дня / 2 ночи", hint: HINT_DETACHED },
      nights: { placeholder: "Например: 2", hint: HINT_DETACHED },
      priceRequired: true,
    }
  }

  return {
    hasTable: true,
    badge: { label: "Таблица дат подключена", tone: "green" },
    action,
    price: {
      placeholder: minPrice > 0 ? fromTablePlaceholder(minPrice) : "Значение из таблицы…",
      hint: HINT_ATTACHED,
    },
    duration: {
      placeholder: duration ? fromTablePlaceholder(duration) : "Значение из таблицы…",
      hint: HINT_ATTACHED,
    },
    nights: {
      placeholder: nights != null ? fromTablePlaceholder(nights) : "Значение из таблицы…",
      hint: HINT_ATTACHED,
    },
    priceRequired: false,
  }
}
