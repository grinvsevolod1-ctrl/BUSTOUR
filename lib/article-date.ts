import { isIsoDate } from "@/lib/dates-table"

const RUSSIAN_MONTHS_GENITIVE = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
] as const

export function formatArticleDate(value: string): string {
  if (!isIsoDate(value)) return value
  const [year, month, day] = value.split("-").map(Number)
  return `${day} ${RUSSIAN_MONTHS_GENITIVE[month - 1]} ${year}`
}
