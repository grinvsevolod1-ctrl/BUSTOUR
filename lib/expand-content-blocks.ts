import type { ContentBlock, SiteSettings } from "@/lib/types"
import { getShortcodesDict, parseShortcodes } from "@/lib/shortcodes"

function expandValue(value: string, dict: Record<string, string>): string {
  if (!value || !value.includes("[")) return value
  return parseShortcodes(value, dict)
}

function expandUnknown(value: unknown, dict: Record<string, string>): unknown {
  if (typeof value === "string") return expandValue(value, dict)
  if (Array.isArray(value)) return value.map((item) => expandUnknown(item, dict))
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = expandUnknown(v, dict)
    }
    return out
  }
  return value
}

/** Expand `[Shortcodes]` in every settings string (public render only — never on admin save). */
export async function expandSettingsValues(settings: SiteSettings): Promise<SiteSettings> {
  const dict = await getShortcodesDict()
  const out: SiteSettings = { ...settings }
  for (const [key, value] of Object.entries(settings)) {
    if (typeof value === "string" && value.includes("[")) {
      out[key] = expandValue(value, dict)
    }
  }
  return out
}

/** Expand `[Shortcodes]` in FAQ / resort / other content blocks (incl. nested table cells). */
export async function expandContentBlocks(blocks: ContentBlock[]): Promise<ContentBlock[]> {
  if (!blocks.length) return blocks
  const dict = await getShortcodesDict()
  return blocks.map((b) => ({
    ...b,
    title: expandValue(b.title, dict),
    subtitle: expandValue(b.subtitle, dict),
    body: expandValue(b.body, dict),
    icon: expandValue(b.icon, dict),
    extra: expandUnknown(b.extra ?? {}, dict) as ContentBlock["extra"],
  }))
}

export async function expandPlainText(text: string): Promise<string> {
  if (!text || !text.includes("[")) return text
  return parseShortcodes(text, await getShortcodesDict())
}

/** Deep-expand `[Shortcodes]` in public entity graphs (tours, buses, articles, dates). Admin reads stay raw. */
export async function expandPublicDeep<T>(value: T): Promise<T> {
  if (value == null) return value
  return expandUnknown(value, await getShortcodesDict()) as T
}

export async function expandPublicList<T>(items: T[]): Promise<T[]> {
  if (!items.length) return items
  const dict = await getShortcodesDict()
  return items.map((item) => expandUnknown(item, dict) as T)
}
