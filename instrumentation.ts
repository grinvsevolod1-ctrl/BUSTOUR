/**
 * Next.js instrumentation hook — выполняется один раз при старте сервера.
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 *
 * Здесь запускаются фоновые задачи, которые должны работать автономно
 * на self-hosted (pm2) окружении без внешнего крона:
 *  - автообновление курсов валют с НБРБ каждые 6 часов.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startCurrencyAutoRefresh } = await import("@/lib/currency-auto-refresh")
    startCurrencyAutoRefresh()
  }
}
