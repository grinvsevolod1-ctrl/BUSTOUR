export type AnalyticsConfig = {
  ymCounterId: string
  gtmId: string
  gaMeasurementId: string
  enableWebvisor: boolean
  goalLeadSuccess: string
  goalCallbackSuccess: string
  goalReviewSuccess: string
  successRedirectUrl: string
}

type AnalyticsWindow = Window & {
  dataLayer?: Record<string, unknown>[]
  ym?: (counterId: number, method: "init" | "reachGoal", ...args: unknown[]) => void
  gtag?: (...args: unknown[]) => void
  __bustourAnalytics?: AnalyticsConfig & { allowed: boolean }
}

export function analyticsConfigFromSettings(settings: Record<string, string>): AnalyticsConfig {
  return {
    ymCounterId: settings["analytics.ymCounterId"]?.trim() ?? "",
    gtmId: settings["analytics.gtmId"]?.trim() ?? "",
    gaMeasurementId: settings["analytics.gaMeasurementId"]?.trim() ?? "",
    enableWebvisor: ["1", "true"].includes(settings["analytics.enableWebvisor"] ?? "true"),
    goalLeadSuccess: settings["analytics.goalLeadSuccess"]?.trim() || "lead_success",
    goalCallbackSuccess: settings["analytics.goalCallbackSuccess"]?.trim() || "callback_request",
    goalReviewSuccess: settings["analytics.goalReviewSuccess"]?.trim() || "review_success",
    successRedirectUrl: safeRedirectUrl(settings["analytics.successRedirectUrl"] ?? ""),
  }
}

export function safeRedirectUrl(value: string): string {
  const trimmed = value.trim()
  return trimmed.startsWith("/") && !trimmed.startsWith("//") ? trimmed : ""
}

export function setAnalyticsRuntime(config: AnalyticsConfig, allowed: boolean) {
  if (typeof window === "undefined") return
  ;(window as AnalyticsWindow).__bustourAnalytics = { ...config, allowed }
}

export function getAnalyticsRuntime() {
  if (typeof window === "undefined") return undefined
  return (window as AnalyticsWindow).__bustourAnalytics
}

export function trackAnalyticsEvent(
  eventName: string,
  goalId: string,
  params: Record<string, unknown> = {},
) {
  if (typeof window === "undefined") return
  const target = window as AnalyticsWindow
  if (!target.__bustourAnalytics?.allowed) return

  target.dataLayer = target.dataLayer || []
  target.dataLayer.push({ event: eventName, ...(goalId ? { goalId } : {}), ...params })

  const counterId = Number(target.__bustourAnalytics.ymCounterId)
  if (target.ym && Number.isSafeInteger(counterId) && counterId > 0 && goalId) {
    target.ym(counterId, "reachGoal", goalId, params)
  }
  target.gtag?.("event", eventName, params)
}