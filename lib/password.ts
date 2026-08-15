import { scrypt, scryptSync, randomBytes, timingSafeEqual } from "node:crypto"

// Format: <saltHex>:<hashHex>
export function hashPassword(password: string): string {
  const salt = randomBytes(16)
  const hash = scryptSync(password, salt, 64)
  return `${salt.toString("hex")}:${hash.toString("hex")}`
}

/**
 * Async scrypt — runs in libuv thread pool, does NOT block the event loop.
 * Use this on the login hot path (sync scrypt under brute-force = self-DoS).
 */
export function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(":")
  if (!saltHex || !hashHex) return Promise.resolve(false)
  const salt = Buffer.from(saltHex, "hex")
  const hash = Buffer.from(hashHex, "hex")
  return new Promise((resolve) => {
    scrypt(password, salt, 64, (err, candidate) => {
      if (err || candidate.length !== hash.length) return resolve(false)
      resolve(timingSafeEqual(candidate, hash))
    })
  })
}
