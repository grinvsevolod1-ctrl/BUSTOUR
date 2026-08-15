"use client"

import { ChevronDown, ExternalLink } from "lucide-react"
import { Badge, ButtonLink, Input, Label, Select } from "@/components/admin/ui"
import { emptyDatesTable } from "@/lib/dates-table"
import { buildTourAdditionalUi } from "@/lib/tour-additional-ui"
import type { Currency, DatesTable } from "@/lib/types"

export type TourAdditionalBlockProps = {
  tourId?: number
  datesTable?: DatesTable
  priceAmount?: number | null
  extraPriceAmount?: number | null
  extraPriceCurrency?: string
  datesCurrency?: string
  duration?: string
  nights?: number | null
  currencyCode?: string
  currencies?: Currency[]
}

export function TourAdditionalBlock({
  tourId,
  datesTable = emptyDatesTable,
  priceAmount,
  extraPriceAmount,
  extraPriceCurrency,
  datesCurrency,
  duration,
  nights,
  currencyCode,
  currencies = [],
}: TourAdditionalBlockProps) {
  const ui = buildTourAdditionalUi({ tourId, table: datesTable })
  const currencyList = currencies.length
    ? currencies
    : [{ id: 0, code: currencyCode || "BYN", label: currencyCode || "BYN", symbol: "—", rate: 1, isBase: true, sortOrder: 0 }]

  return (
    <details className="group rounded-lg border border-admin-border bg-admin-muted/20">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-admin-fg [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 flex-wrap items-center gap-2">
          Дополнительно
          <Badge tone={ui.badge.tone}>{ui.badge.label}</Badge>
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-admin-fg-subtle transition-transform group-open:rotate-180" />
      </summary>
      <div className="space-y-4 border-t border-admin-border p-4">
        {ui.action ? (
          <div className="flex flex-wrap items-center gap-2">
            <ButtonLink href={ui.action.href} target="_blank" rel="noopener noreferrer" variant="secondary" size="sm">
              {ui.action.label}
              <ExternalLink className="h-3.5 w-3.5" />
            </ButtonLink>
          </div>
        ) : (
          <p className="text-xs text-admin-fg-subtle">
            Сохраните тур — затем можно создать таблицу дат в новой вкладке.
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div>
            <Label htmlFor="priceAmount" required={ui.priceRequired}>
              Цена (базовая валюта)
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="priceAmount"
                name="priceAmount"
                type="number"
                min={0}
                step="0.01"
                defaultValue={priceAmount || ""}
                placeholder={ui.price.placeholder}
                required={ui.priceRequired}
                className="flex-1"
              />
              <Select
                id="datesCurrency"
                name="datesCurrency"
                defaultValue={datesCurrency || currencyCode || "BYN"}
                className="shrink-0 w-auto min-w-[72px] bg-admin-muted"
              >
                {currencyList.map((currency) => (
                  <option key={currency.code} value={currency.code}>
                    {currency.code}
                  </option>
                ))}
              </Select>
            </div>
            <p className="mt-1 text-xs text-admin-fg-subtle">{ui.price.hint}</p>
          </div>
          <div>
            <Label htmlFor="extraPriceAmount">Доп. цена</Label>
            <Input
              id="extraPriceAmount"
              name="extraPriceAmount"
              type="number"
              min={0}
              step="0.01"
              defaultValue={extraPriceAmount || ""}
              placeholder="100"
            />
            <p className="mt-1 text-xs text-admin-fg-subtle">Дополнительная часть цены, например за проживание/проезд.</p>
          </div>
          <div>
            <Label htmlFor="extraPriceCurrency">Валюта доп. цены</Label>
            <Select
              id="extraPriceCurrency"
              name="extraPriceCurrency"
              defaultValue={extraPriceCurrency || "USD"}
              className="w-full"
            >
              <option value="">— не указана —</option>
              {currencyList.map((currency) => (
                <option key={currency.code} value={currency.code}>
                  {currency.code}
                </option>
              ))}
            </Select>
            <p className="mt-1 text-xs text-admin-fg-subtle">Обычно USD или EUR.</p>
          </div>
          <div>
            <Label htmlFor="duration">Длительность</Label>
            <Input
              id="duration"
              name="duration"
              defaultValue={duration}
              placeholder={ui.duration.placeholder}
            />
            <p className="mt-1 text-xs text-admin-fg-subtle">{ui.duration.hint}</p>
          </div>
          <div>
            <Label htmlFor="nights">Ночей</Label>
            <Input
              id="nights"
              name="nights"
              type="number"
              min={0}
              defaultValue={nights ?? 0}
              placeholder={ui.nights.placeholder}
            />
            <p className="mt-1 text-xs text-admin-fg-subtle">{ui.nights.hint}</p>
          </div>
        </div>
      </div>
    </details>
  )
}
