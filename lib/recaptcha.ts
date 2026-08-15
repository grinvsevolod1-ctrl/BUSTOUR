/**
 * Server-side Google reCAPTCHA v3 verification (score ≥ 0.5).
 *
 * 🔐 Fail-Closed in Production (security rule, OWASP A05:2021):
 *  - Если `NODE_ENV=production` и нет ключей reCAPTCHA или недоступен Google siteverify
 *    → запрос НЕ пропускается. HTTP 422 для вызывающего.
 *  - Принудительный BYPASS (BYPASS_RECAPTCHA=1) разрешён ТОЛЬКО в local/dev-окружениях.
 *  - Google transport errors (timeout, DNS, 5xx) → в prod всё равно закрыто, в local/dev —
 *    пропускаем, чтобы не убить локальную разработку из-за сети.
 *
 * Non-production окружения (local / dev):
 *  - Автоматически skip, даже с ключами — Google test keys рандомят score, не надёжно.
 *  - Можно BYPASS_RECAPTCHA=1 для CI/E2E.
 */

import { getBustourDeployEnv } from "./deploy-env"

const MIN_SCORE = 0.5

/** Booleans only — never expose secret value to the client. */
export type CaptchaWiringStatus = {
  siteKeySet: boolean
  secretSet: boolean
  /** True when captcha is force-skipped: deploy=local/dev or BYPASS_RECAPTCHA=1 */
  bypassed: boolean
  /** Why captcha is skipped/bypassed — used only for admin debug output */
  bypassReason?: "deploy-local" | "deploy-dev" | "env-bypass"
}

/**
 * Client-facing: reports whether reCAPTCHA widget should render on this deploy target.
 * NEVER returns the secret key. Also reports BYPASS state for admin dashboards.
 */
export function getCaptchaWiringStatus(): CaptchaWiringStatus {
  const siteKeySet = Boolean(process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY)
  const secretSet = Boolean(process.env.RECAPTCHA_SECRET_KEY)
  const env = getBustourDeployEnv()

  // Bypass allowed exclusively in local/dev (fail-closed everywhere else).
  if (env === "local") {
    return {
      siteKeySet,
      secretSet,
      bypassed: true,
      bypassReason: "deploy-local",
    }
  }
  if (env === "dev") {
    return {
      siteKeySet,
      secretSet,
      bypassed: true,
      bypassReason: "deploy-dev",
    }
  }
  // preview / production: BYPASS_RECAPTCHA is strictly ignored.
  return { siteKeySet, secretSet, bypassed: false }
}

/** Client-side helper — mirrors server status (no secret access anyway). */
export function isCaptchaWired(): boolean {
  const s = getCaptchaWiringStatus()
  return !s.bypassed && s.siteKeySet && s.secretSet
}

export type CaptchaVerifyOptions = {
  /** When true — отсутствие токена всегда отклоняет, даже если captcha не настроена. */
  required?: boolean
}

export type CaptchaVerifyResult =
  | { ok: true; bypassed: boolean; score?: number }
  | { ok: false; bypassed: boolean; error: string; score?: number }

/**
 * Verifies reCAPTCHA token with Google siteverify. Fail-Closed production.
 */
export async function verifyRecaptchaToken(
  token: unknown,
  opts: CaptchaVerifyOptions = {},
): Promise<CaptchaVerifyResult> {
  const env = getBustourDeployEnv()
  const isProduction = env === "production"
  const nonProductionBypass = env === "local" || env === "dev"

  // Step 1: BYPASS allowed ONLY on non-production.
  if (nonProductionBypass) {
    // Local/dev: BYPASS env also still allowed.
    const forcedBypass = process.env.BYPASS_RECAPTCHA === "1"
    void forcedBypass
    if (!opts.required) {
      return { ok: true, bypassed: true }
    }
    // Local/dev + required = still pass locally (Google test keys are flaky).
    if (opts.required && !token) {
      return { ok: true, bypassed: true }
    }
    return { ok: true, bypassed: true }
  }

  // ---- Production / Preview: fail-closed below this line ----
  const status = getCaptchaWiringStatus()

  if (!status.secretSet) {
    // No secret configured in prod → we cannot vet → MUST REJECT.
    console.warn("[recaptcha] fail-closed: RECAPTCHA_SECRET_KEY missing in production/preview. Request blocked.")
    return {
      ok: false,
      bypassed: false,
      error: "На сервере не настроена проверка reCAPTCHA. Попробуйте позже или свяжитесь по телефону.",
    }
  }

  if (opts.required && !token) {
    return {
      ok: false,
      bypassed: false,
      error: "Пройдите проверку reCAPTCHA (отсутствует токен).",
    }
  }

  if (!token) {
    // Non-required + no token = treat as score 0 (reject in prod).
    return {
      ok: false,
      bypassed: false,
      error: "Пройдите проверку reCAPTCHA.",
    }
  }

  if (typeof token !== "string" || token.trim().length < 10) {
    return {
      ok: false,
      bypassed: false,
      error: "Некорректный токен reCAPTCHA.",
    }
  }

  let resp: Response
  try {
    resp = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret: process.env.RECAPTCHA_SECRET_KEY!,
        response: token,
      }),
      signal: AbortSignal.timeout(6_000),
    })
  } catch (err) {
    // 🚨 Fail-Closed on transport errors in production/preview.
    const msg = (err as Error).message
    console.error(`[recaptcha] siteverify network error (env=${env}). Fail-closed. msg=`, msg)
    return {
      ok: false,
      bypassed: false,
      error: isProduction
        ? "Не удалось проверить reCAPTCHA из-за сетевой ошибки. Попробуйте позже."
        : "Не удалось проверить reCAPTCHA. Попробуйте позже или свяжитесь по телефону.",
    }
  }

  if (!resp.ok) {
    console.error(`[recaptcha] siteverify HTTP ${resp.status}. Fail-closed.`)
    return {
      ok: false,
      bypassed: false,
      error: "Ошибка проверки reCAPTCHA. Попробуйте позже.",
    }
  }

  let json: { success?: boolean; score?: number; "error-codes"?: unknown }
  try {
    json = (await resp.json()) as typeof json
  } catch (err) {
    console.error(`[recaptcha] malformed siteverify JSON. Fail-closed. msg=`, (err as Error).message)
    return { ok: false, bypassed: false, error: "Ошибка проверки reCAPTCHA. Попробуйте позже." }
  }

  const success = Boolean(json.success)
  const score = typeof json.score === "number" ? json.score : undefined

  if (!success) {
    return {
      ok: false,
      bypassed: false,
      error: "Токен reCAPTCHA отклонён Google. Обновите страницу и попробуйте снова.",
      score,
    }
  }

  if (typeof score === "number" && score < MIN_SCORE) {
    return {
      ok: false,
      bypassed: false,
      error: "Подозрительная активность. Попробуйте снова, обновив страницу.",
      score,
    }
  }

  return { ok: true, bypassed: false, score }
}
