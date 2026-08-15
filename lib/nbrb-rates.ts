// National Bank of the Republic of Belarus (NBRB / Нацбанк РБ) API client
// Docs: https://developer.nbrb.by/jsp/index.jsp
// Public endpoint — no API key required.
//
// Endpoint for a specific currency (Cur_Abbreviation = "USD" / "EUR") returns the
// official rate in BYN per 1 unit of foreign currency. Example:
//   GET https://api.nbrb.by/exrates/rates/USD?parammode=2
//   => { Cur_OfficialRate: 3.1256, Cur_Scale: 1, Cur_Abbreviation: "USD", ... }

export type NbrbRateResponse = {
  Cur_ID: number
  Cur_Abbreviation: string
  Cur_Scale: number
  Cur_Name: string
  Cur_OfficialRate: number
  Date: string
}

export const NBRB_API_BASE = "https://api.nbrb.by"

export function nbrbRateUrl(abbreviation: string): string {
  return `${NBRB_API_BASE}/exrates/rates/${encodeURIComponent(abbreviation)}?parammode=2`
}

async function fetchNbrb(abbreviation: string): Promise<NbrbRateResponse> {
  const res = await fetch(nbrbRateUrl(abbreviation), {
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
    headers: { Accept: "application/json" },
  })
  if (!res.ok) {
    throw new Error(
      `NBRB API HTTP ${res.status} fetching ${abbreviation}: ${res.statusText}`,
    )
  }
  const json = (await res.json()) as NbrbRateResponse
  if (
    !json ||
    json.Cur_Abbreviation !== abbreviation ||
    !Number.isFinite(json.Cur_OfficialRate) ||
    json.Cur_OfficialRate <= 0 ||
    !Number.isFinite(json.Cur_Scale) ||
    json.Cur_Scale <= 0
  ) {
    throw new Error(`NBRB API returned invalid payload for ${abbreviation}`)
  }
  return json
}

export type NbrbOfficialRateResult = {
  code: string
  // Official BYN per 1 unit of foreign currency (BYN/USD or BYN/EUR)
  bynPerUnit: number
  // Date string as of which the NB issued the rate (YYYY-MM-DD)
  asOfDate: string
}

// Fetch the NB's official BYN/USD and BYN/EUR rates. If one call fails the
// companion result is discarded so the caller can retry everything together.
export async function fetchOfficialUsdEur(): Promise<{
  usd: NbrbOfficialRateResult
  eur: NbrbOfficialRateResult
}> {
  const [usd, eur] = await Promise.all([fetchNbrb("USD"), fetchNbrb("EUR")])
  return {
    usd: {
      code: "USD",
      bynPerUnit: Number((usd.Cur_OfficialRate / Math.max(1, usd.Cur_Scale)).toFixed(6)),
      asOfDate: String(usd.Date || "").slice(0, 10),
    },
    eur: {
      code: "EUR",
      bynPerUnit: Number((eur.Cur_OfficialRate / Math.max(1, eur.Cur_Scale)).toFixed(6)),
      asOfDate: String(eur.Date || "").slice(0, 10),
    },
  }
}

export async function fetchOfficialRates(codes: string[]): Promise<{
  rates: NbrbOfficialRateResult[]
  skipped: string[]
}> {
  const results = await Promise.all(
    [...new Set(codes.map((code) => code.trim().toUpperCase()).filter(Boolean))].map(async (code) => {
      try {
        const rate = await fetchNbrb(code)
        return {
          code,
          result: {
            code,
            bynPerUnit: Number((rate.Cur_OfficialRate / rate.Cur_Scale).toFixed(6)),
            asOfDate: String(rate.Date || "").slice(0, 10),
          } satisfies NbrbOfficialRateResult,
        }
      } catch (error) {
        if (error instanceof Error && error.message.includes("HTTP 404")) return { code, result: null }
        throw error
      }
    }),
  )
  return {
    rates: results.flatMap(({ result }) => (result ? [result] : [])),
    skipped: results.filter(({ result }) => !result).map(({ code }) => code),
  }
}

// Convert BYN-per-foreign (bynPerUsd) to foreign-per-BYN (how much USD for 1 BYN).
// currencies.rate for USD stores "how many USD for 1 BYN" (see currencies.rate
// contract: "сколько за 1 единицу базовой (BYN)"). So usd rate = 1 / bynPerUsd.
export function bynPerUnitToRate(bynPerUnit: number): number {
  if (!Number.isFinite(bynPerUnit) || bynPerUnit <= 0) return 0
  return Number((1 / bynPerUnit).toFixed(6))
}

// Add the configured percentage to the stored foreign-per-BYN rate.
// Example: 0.33 + 2% = 0.3366.
export function applyMarkupToRate(rateForeignPerByn: number, markupPercent: number): number {
  if (!Number.isFinite(rateForeignPerByn) || rateForeignPerByn <= 0) return 0
  const factor = 1 + (Number(markupPercent) || 0) / 100
  return Number((rateForeignPerByn * factor).toFixed(6))
}

export type ApplyRatesResult = {
  updated: number
  skipped: string[]
  asOfDates: Partial<Record<"USD" | "EUR", string>>
  markupPercent: number
  commercialRates: Partial<Record<"USD" | "EUR", number>>
}
