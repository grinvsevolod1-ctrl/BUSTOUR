import { createHmac, timingSafeEqual } from "node:crypto"
import { authHmacSecret } from "@/lib/auth-secret"

export const PREVIEW_QUERY = "preview"
export const PREVIEW_TTL_SEC = 60 * 60 // 1 hour

export type PreviewEntityType =
  | "tour"
  | "bus"
  | "article"
  | "transfer"
  | "city"
  | "country"

export type PreviewTokenPayload = {
  type: PreviewEntityType
  id: number
  exp: number
}

const TYPES = new Set<PreviewEntityType>([
  "tour",
  "bus",
  "article",
  "transfer",
  "city",
  "country",
])

function sign(value: string): string {
  return createHmac("sha256", authHmacSecret()).update(value).digest("hex")
}

/** token = type.id.exp.hmac */
export function signPreviewToken(
  input: { type: PreviewEntityType; id: number },
  ttlSec = PREVIEW_TTL_SEC,
): string {
  const exp = Math.floor(Date.now() / 1000) + ttlSec
  const payload = `${input.type}.${input.id}.${exp}`
  return `${payload}.${sign(payload)}`
}

export function verifyPreviewToken(token: string | null | undefined): PreviewTokenPayload | null {
  if (!token) return null
  const parts = token.split(".")
  if (parts.length !== 4) return null
  const [type, idRaw, expRaw, signature] = parts
  if (!TYPES.has(type as PreviewEntityType)) return null
  const id = Number(idRaw)
  const exp = Number(expRaw)
  if (!Number.isFinite(id) || id <= 0 || !Number.isFinite(exp)) return null
  const payload = `${type}.${idRaw}.${expRaw}`
  const expected = sign(payload)
  const a = Buffer.from(signature)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  if (exp * 1000 < Date.now()) return null
  return { type: type as PreviewEntityType, id, exp }
}

export function isPreviewFor(
  token: string | null | undefined,
  type: PreviewEntityType,
  id: number,
): boolean {
  const payload = verifyPreviewToken(token)
  return Boolean(payload && payload.type === type && payload.id === id)
}
