/**
 * Server-side Google reCAPTCHA v3 verification (score ≥ 0.5).
 *
 * 🔐 Fail-Closed everywhere except localhost (security rule, OWASP A05:2021):
 *  - На production/preview И на публичном dev-стенде (VPS) проверка ОБЯЗАТЕЛЬНА.
 *    Нет ключей или недоступен Google siteverify → запрос НЕ пропускается (HTTP 422).
 *  - Автоматический bypass разрешён ТОЛЬКО для `local` (машина разработчика).
 *  - Принудительный BYPASS (BYPASS_RECAPTCHA=1) разрешён в local и dev — нужен для CI/E2E,
 *    но он всегда задаётся явно, а не по умолчанию.
 *
 * ВАЖНО: раньше env=dev пропускал ВСЁ автоматически — публичный VPS-стенд оставался
 * без защиты форм. Теперь dev-стенд проверяет капчу так же, как production.
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

  // Automatic bypass ONLY on the developer machine.
  if (env === "local") {
    return {
      siteKeySet,
      secretSet,
      bypassed: true,
      bypassReason: "deploy-local",
    }
  }
  // dev stand: bypass ONLY when explicitly requested (CI / E2E runs).
  if (env === "dev" && process.env.BYPASS_RECAPTCHA === "1") {
    return {
      siteKeySet,
      secretSet,
      bypassed: true,
      bypassReason: "env-bypass",
    }
  }
  // dev (public VPS) / preview / production: fail-closed, captcha verified.
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

  // Bypass: automatic on local machine, explicit-only (BYPASS_RECAPTCHA=1) on dev stand.
  const bypassAllowed = env === "local" || (env === "dev" && process.env.BYPASS_RECAPTCHA === "1")
  if (bypassAllowed) {
    return { ok: true, bypassed: true }
  }

  // ---- Public dev stand / Preview / Production: fail-closed below this line ----
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
