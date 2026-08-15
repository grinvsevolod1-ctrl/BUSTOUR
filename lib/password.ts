import { scryptSync, randomBytes, timingSafeEqual } from "node:crypto"

// Format: <saltHex>:<hashHex>
export function hashPassword(password: string): string {
  const salt = randomBytes(16)
  const hash = scryptSync(password, salt, 64)
  return `${salt.toString("hex")}:${hash.toString("hex")}`
}

export function verifyPassword(password: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(":")
  if (!saltHex || !hashHex) return false
  const salt = Buffer.from(saltHex, "hex")
  const hash = Buffer.from(hashHex, "hex")
  const candidate = scryptSync(password, salt, 64)
  if (candidate.length !== hash.length) return false
  return timingSafeEqual(candidate, hash)
}
