/**
 * Page section registry — single source for allowMultiple / labels / family (#33 thin).
 * Physical folders + public renderSection deferred; DestinationSectionMap stays.
 * Tours stay on TourSectionKey (unique-by-type).
 */
export type SectionFamily = "shared" | "bus" | "avia" | "hot" | "home"

export type SectionDef = {
  id: string
  label: string
  allowMultiple: boolean
  family: SectionFamily
}

export const SECTION_REGISTRY: readonly SectionDef[] = [
  { id: "search", label: "Фильтр и результаты поиска", allowMultiple: false, family: "shared" },
  { id: "cities", label: "Карточки курортов", allowMultiple: false, family: "shared" },
  { id: "resorts", label: "Таблица", allowMultiple: true, family: "shared" },
  { id: "seo", label: "SEO-текст", allowMultiple: true, family: "shared" },
  { id: "faq", label: "Частые вопросы", allowMultiple: true, family: "shared" },
  { id: "callus", label: "«Есть вопросы?»", allowMultiple: true, family: "shared" },
  { id: "memo", label: "Вкладка памятки", allowMultiple: true, family: "shared" },
] as const

export const MULTIPLIABLE_SECTION_BASES = SECTION_REGISTRY.filter((s) => s.allowMultiple).map(
  (s) => s.id,
) as readonly ("seo" | "resorts" | "faq" | "callus" | "memo")[]

export type MultipliableSectionBase = (typeof MULTIPLIABLE_SECTION_BASES)[number]

export function getSectionDef(id: string): SectionDef | undefined {
  return SECTION_REGISTRY.find((s) => s.id === id)
}

export function isMultipliableSectionBase(key: string): key is MultipliableSectionBase {
  return (MULTIPLIABLE_SECTION_BASES as readonly string[]).includes(key)
}
