import path from "node:path"

/** Absolute dir for local media files (VPS / local Docker). */
export function uploadsDirectory(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): string {
  const override = (env.UPLOADS_DIR || "").trim()
  if (override) return path.resolve(override)
  return path.join(process.cwd(), "public", "uploads")
}

/**
 * Resolve a public `/uploads/...` URL to an absolute path under the uploads root.
 * Returns null on traversal / invalid.
 */
export function resolveUploadDiskPath(
  urlPath: string,
  root = uploadsDirectory(),
): string | null {
  const raw = urlPath.trim()
  const withoutQuery = raw.split("?")[0]!.split("#")[0]!
  const rel = withoutQuery.replace(/^\/uploads\/?/i, "").replace(/^\/+/, "")
  if (!rel || rel.includes("\0")) return null
  const segments = rel.split(/[/\\]+/).filter(Boolean)
  if (!segments.length || segments.some((s) => s === "." || s === "..")) return null
  const candidate = path.resolve(root, ...segments)
  const relative = path.relative(root, candidate)
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) return null
  return candidate
}
