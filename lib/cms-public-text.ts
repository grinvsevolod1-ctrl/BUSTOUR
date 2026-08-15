/**
 * Guard public CMS strings against corrupt admin paste / junk
 * (e.g. `aviatory-home#s-seo-meta`, single-char titles).
 */

const ADMIN_ANCHOR_PLAIN =
  /^(?:[a-z0-9_./-]+#[a-z0-9_-]+)(?:\s+(?:[a-z0-9_./-]+#[a-z0-9_-]+))*$/i

/** Strip tags for validation; keep entities roughly readable. */
export function plainCmsText(raw: string): string {
  return raw
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * True when the value is safe to show as public title / H1 / intro.
 * Rejects empty, too-short, and admin workspace hash pastes.
 */
export function isUsablePublicCmsText(
  raw: string | null | undefined,
  opts?: { minLength?: number },
): boolean {
  if (raw == null) return false
  const plain = plainCmsText(String(raw))
  if (!plain) return false
  const min = opts?.minLength ?? 2
  if (plain.length < min) return false
  if (ADMIN_ANCHOR_PLAIN.test(plain)) return false
  return true
}

/** Use CMS value when usable; otherwise fallback (never empty junk). */
export function resolvePublicCmsText(
  raw: string | null | undefined,
  fallback: string,
  opts?: { minLength?: number },
): string {
  const value = String(raw ?? "").trim()
  return isUsablePublicCmsText(value, opts) ? value : fallback
}
