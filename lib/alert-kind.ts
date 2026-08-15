import type { AlertKind } from "@/lib/types"

/** Select options shared by settings `pageAlertFields` and tour form. */
export const ALERT_KIND_OPTIONS = [
  { value: "info", label: "Информационный", tone: "info" as const },
  { value: "warning", label: "Внимание / Предупреждение", tone: "warning" as const },
]

const KINDS = new Set<string>(ALERT_KIND_OPTIONS.map((o) => o.value))

/** Normalize settings / DB / form values. Empty/unknown → info. Legacy `error` → warning. */
export function parseAlertKind(value: string | null | undefined): AlertKind {
  if (value === "error") return "warning"
  if (value && KINDS.has(value)) return value as AlertKind
  return "info"
}
