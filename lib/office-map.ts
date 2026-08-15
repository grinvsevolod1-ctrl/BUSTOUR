/** Bastur org map-widget (Yandex.by). */
export const DEFAULT_MAP_EMBED_URL =
  "https://yandex.by/map-widget/v1/?ll=27.701630%2C53.949784&mode=search&oid=156910472868&ol=biz&tab=related&z=14.89"

/**
 * Extract the URL used for rendering from either a bare URL or pasted iframe.
 * The original CMS value remains untouched in storage.
 */
export function normalizeMapEmbedInput(raw?: string | null): string {
  const text = String(raw ?? "").trim()
  if (!text) return ""
  const srcMatch =
    text.match(/src\s*=\s*"([^"]+)"/i) ||
    text.match(/src\s*=\s*'([^']+)'/i) ||
    text.match(/src\s*=\s*([^\s>]+)/i)
  if (srcMatch?.[1]) return srcMatch[1].trim()
  return text
}

/** Empty → default widget; pasted iframe → its src; otherwise URL as-is. */
export function resolveMapEmbedUrl(src?: string): string {
  const raw = normalizeMapEmbedInput(src)
  return raw || DEFAULT_MAP_EMBED_URL
}
