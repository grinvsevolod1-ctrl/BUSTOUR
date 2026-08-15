/** Legal documents linked from the site footer (Figma Design). */

export const LEGAL_SLUGS = ["privacy", "offer", "cookies", "video"] as const

export type LegalSlug = (typeof LEGAL_SLUGS)[number]

export type LegalPageConfig = {
  slug: LegalSlug
  /** Public URL path */
  path: string
  /** Default H1 / breadcrumb label */
  title: string
  /** Admin heading */
  adminLabel: string
  settingsPrefix: string
}

export const legalPages: Record<LegalSlug, LegalPageConfig> = {
  privacy: {
    slug: "privacy",
    path: "/legal/privacy",
    title: "Политика конфиденциальности",
    adminLabel: "Политика конфиденциальности",
    settingsPrefix: "privacy",
  },
  offer: {
    slug: "offer",
    path: "/legal/offer",
    title: "Договор публичной оферты ЧТУП «БасТур»",
    adminLabel: "Договор публичной оферты",
    settingsPrefix: "offer",
  },
  cookies: {
    slug: "cookies",
    path: "/legal/cookies",
    title: "Политика в отношении обработки cookie",
    adminLabel: "Политика cookie",
    settingsPrefix: "cookies",
  },
  video: {
    slug: "video",
    path: "/legal/video",
    title: "Политика видеонаблюдения",
    adminLabel: "Политика видеонаблюдения",
    settingsPrefix: "video",
  },
}

export function isLegalSlug(value: string): value is LegalSlug {
  return (LEGAL_SLUGS as readonly string[]).includes(value)
}

export function legalSettingKeys(prefix: string) {
  return {
    title: `${prefix}.title`,
    body: `${prefix}.body`,
    metaTitle: `${prefix}.metaTitle`,
    metaDescription: `${prefix}.metaDescription`,
    metaShortDesc: `${prefix}.metaShortDesc`,
  }
}
