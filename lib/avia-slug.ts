/** Default public URL prefix for avia tours branch (`settings["aviatory.slug"]`). */
export const DEFAULT_AVIA_SLUG = "aviatury"

/** Internal Next.js route folder — never the public default. */
export const AVIA_INTERNAL_PREFIX = "aviatory"

/** Allowed shape for the public slug: lowercase latin, digits, hyphen. */
const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,62}$/

/**
 * Существующие корневые разделы и служебные пути сайта.
 * Если админ сохранит одно из этих значений как aviatory.slug, middleware начал бы
 * переписывать чужие разделы (например /hot → /aviatory) и сломал бы сайт.
 */
const RESERVED_SLUGS = new Set([
  AVIA_INTERNAL_PREFIX,
  "admin",
  "api",
  "avtobusnye-tury",
  "hot",
  "tours",
  "testimonials",
  "company",
  "contacts",
  "legal",
  "articles",
  "buses",
  "transfers",
  "uploads",
  "sitemap.xml",
  "robots.txt",
  "favicon.ico",
  "_next",
])

/**
 * Public path segment for the avia branch.
 * Пустое, зарезервированное или невалидное значение → безопасный дефолт `aviatury`.
 */
export function resolveAviaSlug(raw: string | null | undefined): string {
  const s = (raw || "").trim().toLowerCase()
  if (!s || !SLUG_RE.test(s) || RESERVED_SLUGS.has(s)) return DEFAULT_AVIA_SLUG
  return s
}

/** Validation helper for the admin settings form. */
export function isValidAviaSlug(raw: string): boolean {
  const s = raw.trim().toLowerCase()
  return SLUG_RE.test(s) && !RESERVED_SLUGS.has(s)
}
