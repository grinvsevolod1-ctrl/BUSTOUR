/**
 * Media storage — single mode: LOCAL DISK.
 * Vercel Blob / remote object storage intentionally removed.
 * Historical remote URLs (from legacy Blob) are treated as remote so deletion
 * can skip the disk resolver, but NEW uploads always land at /uploads/*.
 */
export type MediaStorageMode = "local"
export function mediaStorageMode(
  _env?: NodeJS.ProcessEnv | Record<string, string | undefined>,
): MediaStorageMode {
  return "local"
}

export function isRemoteMediaUrl(url: string): boolean {
  return /^https?:\/\//i.test(url.trim())
}
