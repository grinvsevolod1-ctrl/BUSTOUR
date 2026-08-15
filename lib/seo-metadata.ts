import type { Metadata } from "next"
import { branchPublicPrefix } from "@/lib/admin-public-href"
import { resolvePublicCmsText } from "@/lib/cms-public-text"
import { getAltTextByUrl } from "@/lib/media/service"
import { expandShortcodes } from "@/lib/shortcodes"
import { canonicalAbsoluteUrl, getCanonicalOrigin } from "@/lib/canonical-origin"

const CANONICAL_SITE_URL = getCanonicalOrigin()

export function absoluteUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`
  return `${CANONICAL_SITE_URL}${normalized}`
}

/** SERP-friendly title length (visible ~50–60). */
export function clampMetaTitle(title: string, max = 60): string {
  const t = title.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1).trimEnd()}…`
}

/** SERP-friendly description length (visible ~150–160). */
export function clampMetaDescription(description: string, max = 160): string {
  const d = description.trim()
  if (d.length <= max) return d
  return `${d.slice(0, max - 1).trimEnd()}…`
}

export type MetadataFromSettingsOptions = {
  /** Site-relative path for canonical, e.g. `/hot/` or `/aviatury/egipet/`. */
  path?: string
  /** Override image alt (tests). Default: media library alt_text, then title. */
  imageAlt?: string
}

/**
 * Build Next.js Metadata from CMS settings keys:
 * `{prefix}.metaTitle`, `.metaShortDesc` (preview, preferred), `.metaDescription` (fallback), `.metaImage`.
 * Image alt comes from media library (`media_files.alt_text`) by URL.
 */
// PNG, не SVG: Telegram/WhatsApp/Facebook не рендерят SVG в превью ссылок.
const FALLBACK_OG_IMAGE = '/images/og-default.png'

export async function metadataFromSettings(
  settings: Record<string, string>,
  prefix: string,
  fallbackTitle: string,
  fallbackDescription: string,
  options?: MetadataFromSettingsOptions,
): Promise<Metadata> {
  const rawTitle = resolvePublicCmsText(settings[`${prefix}.metaTitle`], fallbackTitle)
  const rawDescription = resolvePublicCmsText(
    settings[`${prefix}.metaShortDesc`] || settings[`${prefix}.metaDescription`],
    fallbackDescription,
    { minLength: 3 },
  )
  const keywordsRaw = (settings[`${prefix}.metaKeywords`] || "").trim()
  const [title, description, keywordsExpanded] = await Promise.all([
    expandShortcodes(rawTitle).then(clampMetaTitle),
    expandShortcodes(rawDescription).then(clampMetaDescription),
    keywordsRaw ? expandShortcodes(keywordsRaw) : Promise.resolve(""),
  ])
  const image = settings[`${prefix}.metaImage`] || FALLBACK_OG_IMAGE
  const imageAlt =
    options?.imageAlt?.trim() ||
    (image ? (await getAltTextByUrl(image)) : null) ||
    title
  const canonical = options?.path ? absoluteUrl(options.path) : undefined
  const canonicalOgImageUrl = canonicalAbsoluteUrl(image)

  return {
    title,
    description,
    ...(keywordsExpanded
      ? { keywords: keywordsExpanded.split(/,\s*/).filter(Boolean) }
      : {}),
    metadataBase: new URL(CANONICAL_SITE_URL),
    ...(canonical ? { alternates: { canonical } } : {}),
    openGraph: {
      title,
      description,
      ...(canonical ? { url: canonical } : {}),
      ...(canonicalOgImageUrl ? { images: [{ url: canonicalOgImageUrl, alt: imageAlt }] } : {}),
    },
    twitter: {
      card: canonicalOgImageUrl ? "summary_large_image" : "summary",
      title,
      description,
      ...(canonicalOgImageUrl ? { images: [canonicalOgImageUrl] } : {}),
    },
  }
}

/** Country listing paths for sitemap — public branch prefix (avia → aviatury by default). */
export function sitemapCountryPaths(
  countries: Array<{ slug: string; category: "bus" | "avia" | "hot" }>,
  aviaSlugRaw?: string | null,
): string[] {
  return countries.map((country) => {
    const prefix = branchPublicPrefix(country.category, aviaSlugRaw)
    return `/${prefix}/${country.slug}/`
  })
}
