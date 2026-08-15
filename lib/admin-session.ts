import { createHmac, timingSafeEqual } from "node:crypto"
import { authHmacSecret } from "@/lib/auth-secret"

export const ADMIN_COOKIE_NAME = "bastur_admin"
export const ADMIN_SESSION_TTL_SEC = 60 * 60 * 24 * 7 // 7 days

/**
 * Secure cookie flag for admin session.
 * Prefer NEXT_PUBLIC_SITE_URL protocol: https → secure, http → not secure
 * (DEV-stand HTTP VPS must not set Secure or the browser drops the cookie).
 * Override: ADMIN_COOKIE_SECURE=0|1
 */
export function adminSessionCookieSecure(): boolean {
  const override = (process.env.ADMIN_COOKIE_SECURE || "").trim().toLowerCase()
  if (override === "1" || override === "true" || override === "yes") return true
  if (override === "0" || override === "false" || override === "no") return false
  const site = (process.env.NEXT_PUBLIC_SITE_URL || "").trim().toLowerCase()
  if (site.startsWith("https://")) return true
  if (site.startsWith("http://")) return false
  return process.env.NODE_ENV === "production"
}

function sign(value: string): string {
  return createHmac("sha256", authHmacSecret()).update(value).digest("hex")
}

/** token = adminId.expiresAt.signature */
export function createAdminSessionToken(adminId: number, ttlSec = ADMIN_SESSION_TTL_SEC): string {
  const expiresAt = Math.floor(Date.now() / 1000) + ttlSec
  const payload = `${adminId}.${expiresAt}`
  return `${payload}.${sign(payload)}`
}

export function verifyAdminSessionToken(token: string | null | undefined): { adminId: number } | null {
  if (!token) return null
  const parts = token.split(".")
  if (parts.length !== 3) return null
  const [adminIdRaw, expiresAt, signature] = parts
  const payload = `${adminIdRaw}.${expiresAt}`
  let expected: string
  try {
    expected = sign(payload)
  } catch {
    // AUTH_SECRET missing in production — treat session as invalid, don't crash RSC.
    return null
  }
  const a = Buffer.from(signature)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  if (Number(expiresAt) * 1000 < Date.now()) return null
  const adminId = Number(adminIdRaw)
  if (!Number.isFinite(adminId) || adminId <= 0) return null
  return { adminId }
}

export function hasValidAdminSessionToken(token: string | null | undefined): boolean {
  return verifyAdminSessionToken(token) != null
}
