import { extToType } from "@/lib/media-utils"

/** Pathname without query/hash — works for `/uploads/x.mp4` and Blob HTTPS URLs. */
export function mediaPathname(url: string): string {
  return url.trim().split(/[?#]/, 1)[0] ?? ""
}

/** Local `/uploads/…` or remote Blob/CDN file with a video extension. */
export function isDirectVideoUrl(url: string): boolean {
  return extToType(mediaPathname(url)) === "video"
}

/**
 * YouTube/Vimeo → embed URL; uploaded mp4/webm (local or Blob) → original URL for `<video>`.
 * Uses pathname + extToType (same as tour gallery) so `?download=1` / hash do not break Blob paths.
 */
export function getEmbedUrl(url: string): string | null {
  const trimmed = url.trim()
  if (!trimmed) return null
  const yt = trimmed.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/,
  )
  if (yt) return `https://www.youtube.com/embed/${yt[1]}?rel=0&autoplay=1`
  const vm = trimmed.match(/vimeo\.com\/(?:video\/)?(\d+)/)
  if (vm) return `https://player.vimeo.com/video/${vm[1]}?autoplay=1`
  if (isDirectVideoUrl(trimmed)) return trimmed
  return null
}

export function fallbackThumbnail(url: string): string | null {
  const yt = url
    .trim()
    .match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/)
  return yt ? `https://img.youtube.com/vi/${yt[1]}/hqdefault.jpg` : null
}
