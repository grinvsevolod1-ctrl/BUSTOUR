/** Map libSQL / SQLite constraint errors to admin-facing Russian messages. */
export function mapDbError(err: unknown, fallback = "Ошибка сохранения"): string {
  if ((err as { code?: string })?.code === "SLUG_EXISTS" && err instanceof Error) {
    return err.message
  }
  const msg = err instanceof Error ? err.message : String(err)
  const lower = msg.toLowerCase()
  if (lower.includes("unique") && lower.includes("slug")) {
    return "Запись с таким slug уже существует — укажите другой slug"
  }
  if (lower.includes("unique")) {
    return "Нарушено ограничение уникальности — проверьте поля"
  }
  if (lower.includes("foreign key")) {
    return "Нельзя выполнить операцию: есть связанные записи"
  }
  if (lower.includes("constraint")) {
    return "Нарушено ограничение базы данных"
  }
  return fallback
}

export function isConstraintError(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase()
  return msg.includes("unique") || msg.includes("foreign key") || msg.includes("constraint")
}
