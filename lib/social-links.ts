/** Unified social links: one CMS list for header + footer. */

export const SOCIAL_ICON_IDS = ["instagram", "telegram", "youtube", "viber"] as const
export type SocialIconId = (typeof SOCIAL_ICON_IDS)[number]

export type SocialLink = {
  id: string
  name: string
  url: string
  icon: SocialIconId
  showInHeader: boolean
  showInFooter: boolean
}

const LEGACY: {
  key: string
  name: string
  icon: SocialIconId
  showInHeader: boolean
  showInFooter: boolean
}[] = [
  { key: "social.instagram", name: "Instagram", icon: "instagram", showInHeader: false, showInFooter: true },
  { key: "social.youtube", name: "YouTube", icon: "youtube", showInHeader: false, showInFooter: true },
  { key: "social.telegram", name: "Telegram", icon: "telegram", showInHeader: true, showInFooter: true },
  { key: "social.viber", name: "Viber", icon: "viber", showInHeader: true, showInFooter: false },
]

export const SOCIAL_ICON_OPTIONS: { value: SocialIconId; label: string }[] = [
  { value: "instagram", label: "Instagram" },
  { value: "telegram", label: "Telegram" },
  { value: "youtube", label: "YouTube" },
  { value: "viber", label: "Viber" },
]

export const SOCIAL_CIRCLE_BG: Record<SocialIconId, string> = {
  instagram: "bg-[#C13584]",
  telegram: "bg-[#27A6E5]",
  youtube: "bg-[#F40000]",
  viber: "bg-[#7360F2]",
}

export const SOCIAL_FOOTER_BG = SOCIAL_CIRCLE_BG

function asIcon(raw: unknown): SocialIconId {
  const s = String(raw ?? "").trim().toLowerCase()
  return (SOCIAL_ICON_IDS as readonly string[]).includes(s) ? (s as SocialIconId) : "telegram"
}

function asBool(raw: unknown, fallback: boolean): boolean {
  if (typeof raw === "boolean") return raw
  if (raw === 1 || raw === "1" || raw === "true") return true
  if (raw === 0 || raw === "0" || raw === "false") return false
  return fallback
}

/** Bare platform roots (e.g. `https://youtube.com/`) — CMS placeholders, not real links. */
export function isPlaceholderSocialUrl(url: string): boolean {
  const u = url.trim().toLowerCase().replace(/\/+$/, "")
  if (!u) return true
  return (
    u === "https://youtube.com" ||
    u === "http://youtube.com" ||
    u === "https://www.youtube.com" ||
    u === "http://www.youtube.com" ||
    u === "https://instagram.com" ||
    u === "http://instagram.com" ||
    u === "https://www.instagram.com" ||
    u === "http://www.instagram.com" ||
    u === "https://t.me" ||
    u === "http://t.me" ||
    u === "viber://chat"
  )
}

function normalize(raw: unknown, index: number): SocialLink | null {
  if (!raw || typeof raw !== "object") return null
  const o = raw as Record<string, unknown>
  const url = String(o.url ?? "").trim()
  if (!url || isPlaceholderSocialUrl(url)) return null
  const name = String(o.name ?? "").trim()
  const icon = asIcon(o.icon)
  return {
    id: String(o.id ?? `${icon}-${index}`),
    name: name || SOCIAL_ICON_OPTIONS.find((x) => x.value === icon)?.label || icon,
    url,
    icon,
    showInHeader: asBool(o.showInHeader, icon === "telegram" || icon === "viber"),
    showInFooter: asBool(o.showInFooter, icon !== "viber"),
  }
}

/** Prefer `social.links` JSON; else build from legacy `social.*` keys. */
export function parseSocialLinks(settings: Record<string, string | undefined>): SocialLink[] {
  try {
    const parsed = JSON.parse(settings["social.links"] || "[]") as unknown
    if (Array.isArray(parsed) && parsed.length) {
      return parsed
        .map((item, i) => normalize(item, i))
        .filter((x): x is SocialLink => Boolean(x))
    }
  } catch {
    /* fall through to legacy */
  }

  const legacy: SocialLink[] = []
  for (const d of LEGACY) {
    const url = String(settings[d.key] || "").trim()
    if (!url || isPlaceholderSocialUrl(url)) continue
    legacy.push({
      id: d.icon,
      name: d.name,
      url,
      icon: d.icon,
      showInHeader: d.showInHeader,
      showInFooter: d.showInFooter,
    })
  }
  return legacy
}

export function socialsForHeader(settings: Record<string, string | undefined>): SocialLink[] {
  return parseSocialLinks(settings).filter((s) => s.showInHeader && s.url)
}

export function socialsForFooter(settings: Record<string, string | undefined>): SocialLink[] {
  return parseSocialLinks(settings).filter((s) => s.showInFooter && s.url)
}

/** Default list for seed / empty CMS (matches old individual keys). */
export function defaultSocialLinks(): SocialLink[] {
  return [
    {
      id: "instagram",
      name: "Instagram",
      url: "https://instagram.com/",
      icon: "instagram",
      showInHeader: false,
      showInFooter: true,
    },
    {
      id: "youtube",
      name: "YouTube",
      url: "https://youtube.com/",
      icon: "youtube",
      showInHeader: false,
      showInFooter: true,
    },
    {
      id: "telegram",
      name: "Telegram",
      url: "https://t.me/",
      icon: "telegram",
      showInHeader: true,
      showInFooter: true,
    },
    {
      id: "viber",
      name: "Viber",
      url: "viber://chat",
      icon: "viber",
      showInHeader: true,
      showInFooter: false,
    },
  ]
}
