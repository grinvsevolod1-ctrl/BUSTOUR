// Immutable single source of truth for the canonical origin / public site URL.
//
// ⚠️ Trust boundary rule:
// The CMS-authored `site.url` in database settings MUST NEVER be used to derive
// the canonical origin. Database content can be tampered with, so using it
// inside canonical metadata, JSON-LD `@id`, sitemap URLs, or OpenGraph `url`
// fields is a trust model violation (allows CMS to "redirect" search bots).
//
// Only `process.env.NEXT_PUBLIC_SITE_URL` is accepted. The fall-back hard-coded
// default preserves existing SEO state if env is ever accidentally unset.

const DEFAULT_ORIGIN = "https://bastur.by"

const rawOrigin = String(process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_ORIGIN).trim()
const withProtocol = /^https?:\/\//i.test(rawOrigin) ? rawOrigin : `https://${rawOrigin}`

/** Canonical origin with protocol, NO trailing slash. e.g. "https://bastur.by" */
export const CANONICAL_ORIGIN: string = withProtocol.replace(/\/+$/, "")

export function getCanonicalOrigin(): string {
  return CANONICAL_ORIGIN
}

/** Build an absolute URL using canonical origin. Accepts path or absolute URL. */
export function canonicalAbsoluteUrl(pathOrUrl: string | undefined | null): string | undefined {
  const raw = String(pathOrUrl || "").trim()
  if (!raw) return undefined
  if (/^https?:\/\//i.test(raw)) return raw
  const normalized = raw.startsWith("/") ? raw : `/${raw}`
  return `${CANONICAL_ORIGIN}${normalized}`
}
