/**
 * Client-safe reCAPTCHA v3 site key helpers.
 * Integrates with BASTUR_DEPLOY_ENV and BYPASS_RECAPTCHA env on the server
 * so public forms do not load or require grecaptcha on localhost/dev stands
 * even when site keys are configured.
 */
import { getCaptchaWiringStatus } from "./recaptcha"

export function recaptchaSiteKey(): string {
  if (getCaptchaWiringStatus().bypassed) return ""
  return (process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || "").trim()
}

export function isRecaptchaEnabled(): boolean {
  return recaptchaSiteKey().length > 0
}

/** Client validation message when reCAPTCHA is enabled but token missing. */
export function captchaClientError(token: string | undefined): string | undefined {
  if (!isRecaptchaEnabled()) return undefined
  if (!(token || "").trim()) return "Капча не пройдена"
  return undefined
}

/**
 * Public review: captcha required only when site key is set.
 * Without keys — skip so forms can be tested freely.
 */
export function captchaRequiredClientError(token: string | undefined): string | undefined {
  return captchaClientError(token)
}

/** CMS `site.captchaStatusVisible`: default off when unset. */
export function isCaptchaStatusVisible(settings?: Record<string, string> | null): boolean {
  if (!settings) return false
  const v = settings["site.captchaStatusVisible"]
  return v === undefined || v === "" ? false : v === "1"
}
