import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto"
import type { Review } from "@/lib/types"
import { extractLegacyReviewPhone } from "@/lib/review-utils"

const SOURCE_PREFIX = "encphone:"

function contactKey(): Buffer {
  const secret =
    process.env.REVIEW_CONTACT_SECRET ||
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "bustour-dev-review-contact"
  return createHash("sha256").update(secret).digest()
}

/** AES-256-GCM; payload safe to store in reviews.sourceId. */
export function encryptReviewPhone(phone: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", contactKey(), iv)
  const enc = Buffer.concat([cipher.update(phone, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  return [
    "v1",
    iv.toString("base64url"),
    tag.toString("base64url"),
    enc.toString("base64url"),
  ].join(".")
}

export function decryptReviewPhone(payload: string): string | null {
  const [ver, ivB64, tagB64, dataB64] = payload.split(".")
  if (ver !== "v1" || !ivB64 || !tagB64 || !dataB64) return null
  try {
    const decipher = createDecipheriv("aes-256-gcm", contactKey(), Buffer.from(ivB64, "base64url"))
    decipher.setAuthTag(Buffer.from(tagB64, "base64url"))
    const out = Buffer.concat([
      decipher.update(Buffer.from(dataB64, "base64url")),
      decipher.final(),
    ])
    return out.toString("utf8")
  } catch {
    return null
  }
}

export function encodeReviewPhoneSourceId(phone: string): string {
  return `${SOURCE_PREFIX}${encryptReviewPhone(phone)}`
}

export function decodeReviewPhoneSourceId(sourceId: string): string | null {
  const raw = sourceId.trim()
  if (!raw.startsWith(SOURCE_PREFIX)) return null
  return decryptReviewPhone(raw.slice(SOURCE_PREFIX.length))
}

export function resolveAdminReviewPhone(review: Pick<Review, "sourceId" | "text">): string | null {
  return decodeReviewPhoneSourceId(review.sourceId ?? "") || extractLegacyReviewPhone(review.text)
}
