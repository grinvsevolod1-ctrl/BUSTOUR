"use client"

import { useEffect, useState } from "react"
import { Dropdown } from "./dropdown"
import { getTourPriceBreakdown } from "@/lib/currencies"
import type { Currency } from "@/lib/types"

// Single-currency price display with a currency switcher. `amount` is in the
// base currency; other currencies are derived from their stored rate.
export function PriceSwitcher({
  amount,
  currencies,
  className,
  extraPriceAmount = 0,
  extraPriceCurrency = "",
  initialCurrencyCode,
  showCurrencySelector = true,
  showPerPerson = true,
  compact = false,
  shrink = false,
}: {
  amount: number
  currencies: Currency[]
  className?: string
  extraPriceAmount?: number
  extraPriceCurrency?: string
  initialCurrencyCode?: string
  showCurrencySelector?: boolean
  showPerPerson?: boolean
  compact?: boolean
  shrink?: boolean
}) {
  const list = currencies.length ? currencies : [{ id: 0, code: "BYN", label: "BYN", symbol: "Br", rate: 1, isBase: true, sortOrder: 0 }]
  const base = list.find((c) => c.isBase) ?? list[0]
  const [code, setCode] = useState(initialCurrencyCode ?? base.code)
  useEffect(() => setCode(initialCurrencyCode ?? base.code), [base.code, initialCurrencyCode])
  const active = list.find((c) => c.code === code) ?? base
  const price = getTourPriceBreakdown({
    baseAmount: amount,
    activeCurrency: active,
    currencies: list,
    extraPriceAmount,
    extraPriceCurrency,
  })
  const twoPart = Boolean(price.additionalPrice)
  const bigSize = shrink
    ? "text-[11px] min-[400px]:text-[13px] md:text-base"
    : compact
    ? "text-[13px] md:text-base"
    : "text-xl md:text-2xl"
  const smallSize = shrink
    ? "text-[10px] min-[400px]:text-[11px] md:text-sm"
    : compact
    ? "text-xs md:text-sm"
    : "text-sm md:text-base"

  return (
    <span className={`min-w-0 ${className ?? ""}`}>
      <span className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
        <span className={`${bigSize} font-bold text-price`}>{price.mainPrice}</span>
        {twoPart ? <span className={`${smallSize} text-ink-muted`}>+ {price.additionalPrice}</span> : null}
        {showPerPerson ? <span className={`${smallSize} text-ink-muted`}>за человека</span> : null}
      </span>
      {showCurrencySelector && list.length > 1 ? (
        <Dropdown
          value={code}
          options={list.map((c) => c.code)}
          onChange={setCode}
          ariaLabel="Валюта"
          buttonClassName="mt-2 rounded bg-cream px-2 py-1 hover:bg-line/40"
          valueClassName="text-[11px] font-extrabold uppercase text-ink"
          chevronClassName="h-2.5 w-2.5 text-ink-muted"
          menuClassName="left-0 w-auto"
        />
      ) : null}
    </span>
  )
}
