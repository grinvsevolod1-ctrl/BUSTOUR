import { describe, it, expect } from "vitest"
import {
  resolveAviaSlug,
  isValidAviaSlug,
  DEFAULT_AVIA_SLUG,
  AVIA_INTERNAL_PREFIX,
} from "@/lib/avia-slug"

describe("resolveAviaSlug", () => {
  it("валидный слаг проходит как есть", () => {
    expect(resolveAviaSlug("aviatury")).toBe("aviatury")
    expect(resolveAviaSlug("avia-tury-2024")).toBe("avia-tury-2024")
  })

  it("нормализует регистр и пробелы", () => {
    expect(resolveAviaSlug("  AviaTury  ")).toBe("aviatury")
  })

  it("пустое значение → дефолт", () => {
    expect(resolveAviaSlug("")).toBe(DEFAULT_AVIA_SLUG)
    expect(resolveAviaSlug(null)).toBe(DEFAULT_AVIA_SLUG)
    expect(resolveAviaSlug(undefined)).toBe(DEFAULT_AVIA_SLUG)
  })

  it("внутренний префикс /aviatory зарезервирован → дефолт", () => {
    // Иначе middleware зациклится: rewrite /aviatory → /aviatory
    expect(resolveAviaSlug(AVIA_INTERNAL_PREFIX)).toBe(DEFAULT_AVIA_SLUG)
  })

  it("чужие корневые разделы зарезервированы → дефолт", () => {
    for (const reserved of ["admin", "api", "hot", "tours", "avtobusnye-tury", "_next"]) {
      expect(resolveAviaSlug(reserved)).toBe(DEFAULT_AVIA_SLUG)
    }
  })

  it("невалидные символы → дефолт", () => {
    expect(resolveAviaSlug("авиатуры")).toBe(DEFAULT_AVIA_SLUG)
    expect(resolveAviaSlug("avia tury")).toBe(DEFAULT_AVIA_SLUG)
    expect(resolveAviaSlug("avia/tury")).toBe(DEFAULT_AVIA_SLUG)
    expect(resolveAviaSlug("-leading-hyphen")).toBe(DEFAULT_AVIA_SLUG)
  })

  it("слишком длинный слаг (>63) → дефолт", () => {
    expect(resolveAviaSlug("a".repeat(64))).toBe(DEFAULT_AVIA_SLUG)
    expect(resolveAviaSlug("a".repeat(63))).toBe("a".repeat(63))
  })
})

describe("isValidAviaSlug", () => {
  it("зеркалит resolveAviaSlug для формы настроек", () => {
    expect(isValidAviaSlug("aviatury")).toBe(true)
    expect(isValidAviaSlug("admin")).toBe(false)
    expect(isValidAviaSlug("aviatory")).toBe(false)
    expect(isValidAviaSlug("плохой")).toBe(false)
  })
})
