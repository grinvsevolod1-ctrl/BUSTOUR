/**
 * Section bases that can appear more than once in page order (seo2, faq3, callus2…).
 * Re-exports registry (#33); helpers for callus numbered keys stay here.
 */
export {
  MULTIPLIABLE_SECTION_BASES,
  type MultipliableSectionBase,
  isMultipliableSectionBase,
} from "@/lib/section-registry"

/** `callus` / `callus2` / `callus3` … */
export function isCallusSectionKey(key: string): boolean {
  return key === "callus" || /^callus\d+$/.test(key)
}

export function sectionBaseKey(shortKey: string): string {
  return shortKey.replace(/\d+$/, "")
}

export function callusSlotsFromOrder(order: string[]): string[] {
  return order.filter(isCallusSectionKey)
}
