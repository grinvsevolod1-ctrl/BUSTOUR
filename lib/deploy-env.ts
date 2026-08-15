/**
 * Logical deploy target (not the same as NODE_ENV).
 * Docker/Next still use NODE_ENV=production for optimized runtime on the VPS **dev stand**.
 */
export type BustourDeployEnv = "local" | "dev" | "production"

export function getBustourDeployEnv(): BustourDeployEnv {
  const raw = (process.env.BASTUR_DEPLOY_ENV || "").trim().toLowerCase()
  if (raw === "dev" || raw === "development" || raw === "staging" || raw === "vps") return "dev"
  if (raw === "production" || raw === "prod") return "production"

  if (process.env.VERCEL_ENV === "production") return "production"
  if (process.env.VERCEL_ENV === "preview" || process.env.VERCEL_ENV === "development") return "dev"

  if (process.env.NODE_ENV !== "production") return "local"

  // HTTP public URL ⇒ treat as non-prod stand (VPS IP without TLS).
  const site = (process.env.NEXT_PUBLIC_SITE_URL || "").trim().toLowerCase()
  if (site.startsWith("http://")) return "dev"

  return "production"
}

/** Admin chrome badge; null on real production. */
export function deployEnvAdminLabel(): string | null {
  const env = getBustourDeployEnv()
  if (env === "production") return null
  if (env === "dev") return "DEV"
  return "LOCAL"
}
