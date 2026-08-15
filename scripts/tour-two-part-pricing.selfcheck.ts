import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { getTourPriceBreakdown } from "../lib/currencies"

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8")

assert.deepEqual(
  getTourPriceBreakdown({
    baseAmount: 1250,
    activeCurrency: { id: 1, code: "BYN", label: "BYN", symbol: "Br", rate: 1, isBase: true, sortOrder: 0 },
    currencies: [
      { id: 1, code: "BYN", label: "BYN", symbol: "Br", rate: 1, isBase: true, sortOrder: 0 },
      { id: 2, code: "USD", label: "USD", symbol: "$", rate: 0.3125, isBase: false, sortOrder: 1 },
    ],
    extraPriceAmount: 480,
    extraPriceCurrency: "USD",
  }),
  {
    mainPrice: "480 USD",
    additionalPrice: "1 250 Br",
    details: "Основная стоимость: 480 USD (~1 536 Br) + Дополнительная: 1 250 Br",
  },
)

const schema = read("lib/db/schema.ts")
const booking = read("components/site/booking-form.tsx")
const card = read("components/site/tour-card.tsx")
const switcher = read("components/site/price-switcher.tsx")
const tourPage = read("components/site/tour-page-content.tsx")
const featured = read("components/site/featured-tours.tsx")
const publicTours = read("components/site/public-tours.tsx")

assert.match(schema, /export const tourDates[\s\S]*?extraPriceAmount/)
assert.match(schema, /export const tourDates[\s\S]*?extraPriceCurrency/)
assert.match(booking, /PriceSwitcher/)
assert.match(card, /PriceSwitcher/)
assert.match(card, /text-\[13px\][\s\S]*?md:text-base/)
assert.doesNotMatch(switcher, /Итого/)
assert.doesNotMatch(switcher, /showTotal/)
assert.doesNotMatch(switcher, /Tooltip/)
assert.doesNotMatch(booking, /showTotal=\{false\}/)
assert.match(switcher, /price\.additionalPrice/)
assert.match(switcher, /за человека/)
assert.match(tourPage, /<TourCard[\s\S]*?currencies=\{currencies\}/)
assert.match(featured, /<TourCard[\s\S]*?currencies=\{currencies\}/)
assert.match(publicTours, /getCurrencies\(\)/)

console.log("tour-two-part-pricing.selfcheck: ok")
