import { applyMarkupToRate, bynPerUnitToRate, fetchOfficialRates } from "@/lib/nbrb-rates"
import type { Currency } from "@/lib/types"
import { moveSortable, type MoveDirection } from "@/lib/queries/move"

type CurrencyRow = {
  id: number
  code: string
  label: string
  symbol?: string | null
  rate: number
  isBase: boolean
  sortOrder: number
}

function defaultCurrencySymbol(code: string): string {
  switch (code.toUpperCase()) {
    case "BYN": return "Br"
    case "USD": return "$"
    case "EUR": return "€"
    case "RUB": return "₽"
    case "PLN": return "zł"
    default: return code.toUpperCase()
  }
}

async function getCurrencyDbContext() {
  const [{ asc, eq }, { db }, { currencies }, { ensureDb }] = await Promise.all([
    import("drizzle-orm"),
    import("@/lib/db"),
    import("@/lib/db/schema"),
    import("@/lib/db/init"),
  ])
  return { asc, eq, db, currencies, ensureDb }
}

function mapCurrency(row: CurrencyRow): Currency {
  return {
    id: row.id,
    code: row.code,
    label: row.label,
    symbol: row.symbol?.trim() || defaultCurrencySymbol(row.code),
    rate: row.rate,
    isBase: row.isBase,
    sortOrder: row.sortOrder,
  }
}

export async function getCurrencies(): Promise<Currency[]> {
  const { asc, db, currencies, ensureDb } = await getCurrencyDbContext()
  await ensureDb()
  const rows = await db.select().from(currencies).orderBy(asc(currencies.sortOrder), asc(currencies.id))
  return rows.map(mapCurrency)
}

// Single source of truth lives in lib/currencies.ts (re-exported for convenience).
export { getBaseCurrency } from "@/lib/currencies"

export async function refreshCurrenciesFromNbrb(markupPercent = 0): Promise<{
  updated: number
  total: number
  skipped: string[]
  asOfDates: Record<string, string>
  officialRates: Record<string, number>
  markupAmounts: Record<string, number>
  markupPercent: number
  commercialRates: Record<string, number>
}> {
  const { asc, eq, db, currencies, ensureDb } = await getCurrencyDbContext()
  await ensureDb()
  const rows = await db.select().from(currencies).orderBy(asc(currencies.sortOrder), asc(currencies.id))
  const byCode = new Map(rows.map((row) => [row.code.toUpperCase(), row]))
  const targets = rows.filter((row) => !row.isBase).map((row) => row.code.toUpperCase())
  const fetched = await fetchOfficialRates(targets)
  const updates: Array<{ id: number; code: string; rate: number }> = []
  const skipped = [...fetched.skipped]
  const asOfDates: Record<string, string> = {}
  const officialRates: Record<string, number> = {}
  const markupAmounts: Record<string, number> = {}

  for (const result of fetched.rates) {
    const code = result.code
    const row = byCode.get(code)
    if (!row) {
      skipped.push(code)
      continue
    }
    const officialRate = bynPerUnitToRate(result.bynPerUnit)
    const commercialRate = applyMarkupToRate(officialRate, markupPercent)
    if (!Number.isFinite(commercialRate) || commercialRate <= 0) {
      skipped.push(code)
      continue
    }
    asOfDates[code] = result.asOfDate
    officialRates[code] = officialRate
    markupAmounts[code] = Number((commercialRate - officialRate).toFixed(6))
    updates.push({ id: row.id, code, rate: commercialRate })
  }

  for (const update of updates) {
    await db.update(currencies).set({ rate: update.rate }).where(eq(currencies.id, update.id))
  }

  return {
    updated: updates.length,
    total: targets.length,
    skipped,
    asOfDates,
    officialRates,
    markupAmounts,
    markupPercent,
    commercialRates: Object.fromEntries(updates.map(({ code, rate }) => [code, rate])),
  }
}

export async function saveMarkupPercent(markupPercent: number) {
  const { saveSettings } = await import("@/lib/cms")
  await saveSettings({ "currency.markupPercent": String(markupPercent) })
}

export async function getMarkupPercent(): Promise<number> {
  const { getSettings } = await import("@/lib/cms")
  const settings = await getSettings()
  const raw = String(settings["currency.markupPercent"] ?? "0").trim()
  const parsed = Number(raw.replace(/,/g, "."))
  return Number.isFinite(parsed) ? parsed : 0
}

export type CurrencyInput = {
  code: string
  label: string
  symbol: string
  rate: number
  isBase: boolean
}

export async function createCurrency(input: CurrencyInput) {
  const { db, currencies, ensureDb } = await getCurrencyDbContext()
  await ensureDb()
  const existing = await db.select({ sortOrder: currencies.sortOrder }).from(currencies)
  const nextOrder = existing.reduce((max, r) => Math.max(max, r.sortOrder), -1) + 1
  if (input.isBase) await clearBase()
  await db.insert(currencies).values({
    code: input.code.toUpperCase(),
    label: input.label,
    symbol: input.symbol,
    rate: input.isBase ? 1 : input.rate,
    isBase: input.isBase,
    sortOrder: nextOrder,
    createdAt: Date.now(),
  })
  await ensureOneBase()
}

export async function updateCurrency(id: number, input: CurrencyInput) {
  const { db, currencies, ensureDb, eq } = await getCurrencyDbContext()
  await ensureDb()
  if (input.isBase) await clearBase()
  await db
    .update(currencies)
    .set({
      code: input.code.toUpperCase(),
      label: input.label,
      symbol: input.symbol,
      rate: input.isBase ? 1 : input.rate,
      isBase: input.isBase,
    })
    .where(eq(currencies.id, id))
  await ensureOneBase()
}

/** Swap sortOrder with neighbour currency. Normalizes duplicate orders. */
export async function moveCurrency(id: number, direction: MoveDirection) {
  const { asc, eq, db, currencies, ensureDb } = await getCurrencyDbContext()
  await ensureDb()
  const siblings = await db.select().from(currencies).orderBy(asc(currencies.sortOrder), asc(currencies.id))
  // Ленивый контекст БД — без транзакции, поэтому пишем через moveSortable.
  await moveSortable(siblings, id, direction, async (rowId, sortOrder) => {
    await db.update(currencies).set({ sortOrder }).where(eq(currencies.id, rowId))
  })
}

export async function deleteCurrency(id: number) {
  const { db, currencies, ensureDb, eq } = await getCurrencyDbContext()
  await ensureDb()
  await db.delete(currencies).where(eq(currencies.id, id))
  await ensureOneBase()
}

async function clearBase() {
  const { db, currencies } = await getCurrencyDbContext()
  await db.update(currencies).set({ isBase: false })
}

async function ensureOneBase() {
  const { asc, db, currencies, eq } = await getCurrencyDbContext()
  const rows = await db.select().from(currencies).orderBy(asc(currencies.sortOrder), asc(currencies.id))
  if (!rows.length) return
  if (!rows.some((c) => c.isBase)) {
    await db.update(currencies).set({ isBase: true, rate: 1 }).where(eq(currencies.id, rows[0].id))
  } else {
    const base = rows.find((c) => c.isBase)!
    if (base.rate !== 1) await db.update(currencies).set({ rate: 1 }).where(eq(currencies.id, base.id))
  }
}
