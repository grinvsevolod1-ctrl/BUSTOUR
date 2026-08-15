"use client"

import { useState } from "react"
import { ModalTourOrder } from "@/components/site/modals"
import { PriceSwitcher } from "./price-switcher"
import type { Currency } from "@/lib/types"

export function BookingForm({
  price,
  amount,
  currencies = [],
  tour,
  extraPriceAmount = 0,
  extraPriceCurrency = "",
}: {
  price: string
  amount?: number
  currencies?: Currency[]
  tour?: string
  extraPriceAmount?: number
  extraPriceCurrency?: string
}) {
  const [open, setOpen] = useState(false)
  const fallbackAmount = amount && amount > 0 ? amount : Number.parseFloat(price.replace(/[^\d.,]/g, "").replace(",", ".")) || 0

  return (
    <div className="rounded border border-line p-5">
      <div className="mb-4 grid min-w-0 gap-2 sm:grid-cols-[auto_1fr] sm:items-start">
        <span className="text-base text-ink-muted">Стоимость от</span>
        {fallbackAmount > 0 ? (
          <PriceSwitcher
            amount={fallbackAmount}
            currencies={currencies}
            className="min-w-0 sm:text-right"
            extraPriceAmount={extraPriceAmount}
            extraPriceCurrency={extraPriceCurrency}
          />
        ) : (
          <span className="text-xl font-bold text-price md:text-2xl">{price}</span>
        )}
      </div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded bg-brand px-4 py-3 text-base font-semibold text-brand-foreground transition-opacity hover:opacity-90"
      >
        Забронировать
      </button>
      <ModalTourOrder open={open} onClose={() => setOpen(false)} tourTitle={tour ?? ""} />
    </div>
  )
}
