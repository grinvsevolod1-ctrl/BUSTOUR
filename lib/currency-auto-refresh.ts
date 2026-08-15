import "server-only"

/**
 * Автоматическое обновление курсов валют с сайта НБРБ.
 *
 * Запускается из instrumentation.ts при старте сервера (pm2 / next start):
 *  - первый прогон через минуту после старта (даём серверу прогреться);
 *  - далее каждые REFRESH_INTERVAL_HOURS часов;
 *  - обновляет только если данные устарели (замер по last refresh в settings),
 *    так что рестарты pm2 не спамят НБРБ запросами.
 *
 * Ручное обновление из админки (валюты → «Обновить с НБРБ») продолжает работать
 * и использует ту же самую refreshCurrenciesFromNbrb — единый код без дублей.
 */

import { refreshCurrenciesFromNbrb, getMarkupPercent } from "@/lib/currencies-server"
import { getSettings, saveSettings } from "@/lib/cms"

const REFRESH_INTERVAL_HOURS = 6
const LAST_REFRESH_KEY = "currencyNbrbLastAutoRefreshAt"

let started = false

async function isStale(): Promise<boolean> {
  try {
    const all = await getSettings()
    const last = all[LAST_REFRESH_KEY]
    if (!last) return true
    const lastMs = Date.parse(last)
    if (!Number.isFinite(lastMs)) return true
    return Date.now() - lastMs > REFRESH_INTERVAL_HOURS * 3600_000
  } catch {
    return true
  }
}

async function refreshOnce(reason: string): Promise<void> {
  try {
    if (!(await isStale())) return
    const markup = await getMarkupPercent()
    const result = await refreshCurrenciesFromNbrb(markup)
    await saveSettings({ [LAST_REFRESH_KEY]: new Date().toISOString() })
    console.log(
      `[currency-auto-refresh] ${reason}: updated=${result.updated} markup=${markup}% asOf=${JSON.stringify(result.asOfDates)}`,
    )
  } catch (err) {
    // НБРБ недоступен — не валим сервер, попробуем в следующем цикле
    console.error(`[currency-auto-refresh] ${reason} failed:`, err instanceof Error ? err.message : err)
  }
}

export function startCurrencyAutoRefresh(): void {
  if (started) return
  started = true

  // Первый прогон — через минуту после старта
  const initial = setTimeout(() => void refreshOnce("startup"), 60_000)
  initial.unref?.()

  // Периодический прогон
  const interval = setInterval(() => void refreshOnce("interval"), REFRESH_INTERVAL_HOURS * 3600_000)
  interval.unref?.()
}
