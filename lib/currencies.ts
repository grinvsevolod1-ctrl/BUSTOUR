import type { Currency } from "@/lib/types"

export function getBaseCurrency(list: Currency[]): Currency | undefined {
  return list.find((c) => c.isBase) ?? list[0]
}

// Convert a base-currency amount into the target currency using its rate.
export function convert(baseAmount: number, currency: Currency): number {
  return baseAmount * (currency.rate || 1)
}

// Format an already-converted amount with its currency code.
export function formatMoney(amount: number, code: string): string {
  return `${String(Math.ceil(amount)).replace(/\B(?=(\d{3})+(?!\d))/g, " ")} ${code}`
}

export type TourPriceBreakdown = {
  mainPrice: string
  additionalPrice: string
  details?: string
}

export function getTourPriceBreakdown({
  baseAmount,
  activeCurrency,
  currencies,
  extraPriceAmount = 0,
  extraPriceCurrency = "",
}: {
  baseAmount: number
  activeCurrency: Currency
  currencies: Currency[]
  extraPriceAmount?: number
  extraPriceCurrency?: string
}): TourPriceBreakdown {
  const activeCode = activeCurrency.symbol || activeCurrency.code
  const additionalAmount = Math.max(0, baseAmount) * (activeCurrency.rate || 1)
  const additionalPrice = formatMoney(additionalAmount, activeCode)
  const extraCode = extraPriceCurrency.trim().toUpperCase()

  if (!(extraPriceAmount > 0 && extraCode)) {
    return { mainPrice: additionalPrice, additionalPrice: "" }
  }

  const mainPrice = formatMoney(extraPriceAmount, extraCode)
  const extraCurrency = currencies.find((currency) => currency.code.toUpperCase() === extraCode)
  if (!extraCurrency?.rate) return { mainPrice, additionalPrice }

  const convertedMainPrice = (extraPriceAmount / extraCurrency.rate) * (activeCurrency.rate || 1)
  return {
    mainPrice,
    additionalPrice,
    details: `Основная стоимость: ${mainPrice} (~${formatMoney(convertedMainPrice, activeCode)}) + Дополнительная: ${additionalPrice}`,
  }
}

export function formatTourPriceDisplay({
  baseAmount,
  activeCurrency,
  extraPriceAmount = 0,
  extraPriceCurrency = "",
}: {
  baseAmount: number
  activeCurrency: Currency
  extraPriceAmount?: number
  extraPriceCurrency?: string
}): string {
  const baseValue = baseAmount > 0 ? formatMoney(baseAmount * (activeCurrency.rate || 1), activeCurrency.symbol || activeCurrency.code) : ""
  const extraCode = extraPriceCurrency?.trim().toUpperCase()
  const extraValue = extraPriceAmount > 0 && extraCode ? formatMoney(extraPriceAmount, extraCode) : ""

  if (baseValue && extraValue) {
    return `${extraValue} + ${baseValue} за человека`
  }
  if (baseValue) {
    return `${baseValue} за человека`
  }
  if (extraValue) {
    return `${extraValue} за человека`
  }
  return "0 BYN за человека"
}

