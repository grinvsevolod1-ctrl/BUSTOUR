let warnedDevFallback = false

/** Shared HMAC secret for admin session and preview tokens. */
export function authHmacSecret() {
  if (process.env.AUTH_SECRET) return process.env.AUTH_SECRET
  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET must be configured in production")
  }
  if (!warnedDevFallback) {
    console.warn("AUTH_SECRET is not configured; using an insecure development fallback")
    warnedDevFallback = true
  }
  return "dev-insecure-secret-change-me-on-vps"
}
