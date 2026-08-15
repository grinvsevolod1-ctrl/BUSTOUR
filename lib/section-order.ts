import { MULTIPLIABLE_SECTION_BASES } from "@/lib/multipliable-sections"

/**
 * Default order for destination pages (city / country / branch home).
 * «Есть вопросы?» (callus) is 4th — before FAQ. Existing saved `.sections.order` wins.
 */
export const DESTINATION_DEFAULT_SECTION_ORDER = [
  "search",
  "cities",
  "resorts",
  "seo",
  "callus",
  "faq",
] as const

/**
 * @deprecated Preserve this helper only for older public pages that need to
 * guarantee `search` remains first when resolving FALLBACK defaults for pages
 * WITHOUT a saved sections.order. Once all pages are migrated, delete this.
 *
 * The `resolveInitialOrder` helper MUST NOT re-pin `search` when a saved order
 * exists. The user explicitly controls ordering; re-pinning caused the
 * bus-home#sec-order "save succeeds but order unchanged" bug where any
 * custom drag ordering collapsed back to `search` first on reload.
 */
export function destinationSectionOrder(order: string[]): string[] {
  return ["search", ...order.filter((key) => key !== "search")]
}

/**
 * Returns `initialOrder` for the admin PageSectionsManager / site render.
 *
 * RULES (non-negotiable after bus-home#sec-order bug fix):
 *  1. When `savedOrder` exists AND has at least one valid entry → return it
 *     AS-IS. Never re-pin `search` to the front. Users choose their own order.
 *  2. Fallback only: no saved order yet (or empty/garbage) → combine the
 *     default-order entries that pass isValid with any unlisted base short
 *     keys, preserving original order.
 */
export function resolveInitialOrder(
  savedOrder: string | string[] | undefined,
  defaultOrder: string[],
  baseShortKeys: string[],
  multipliableBases: string[] = [...MULTIPLIABLE_SECTION_BASES],
  optionalKeys: string[] = [],
): string[] {
  const validKeys = new Set([...baseShortKeys, ...optionalKeys])
  const isValid = (key: string) =>
    validKeys.has(key) ||
    multipliableBases.some((base) => key !== base && new RegExp(`^${base}\\d+$`).test(key))

  function fallbackMerge(): string[] {
    return [
      ...defaultOrder.filter(isValid),
      ...baseShortKeys.filter((key) => !defaultOrder.includes(key) && !optionalKeys.includes(key)),
    ]
  }

  if (savedOrder === undefined || savedOrder === "") {
    return fallbackMerge()
  }

  const parsed =
    typeof savedOrder === "string"
      ? (() => {
          try {
            const value: unknown = JSON.parse(savedOrder)
            return Array.isArray(value)
              ? value.filter((key): key is string => typeof key === "string")
              : []
          } catch {
            return []
          }
        })()
      : savedOrder

  const kept = parsed.filter(isValid)
  // Empty saved order → fallback, never return [].
  if (!kept.length) return fallbackMerge()
  return kept
}
