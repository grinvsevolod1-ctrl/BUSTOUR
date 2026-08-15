/** Resolve settings-backed page alert text/type (pure — unit-tested). */
export function resolvePageAlert(
  settings: Record<string, string>,
  prefix: string,
  fallbackPrefix?: string,
): { text: string; type: string | undefined } {
  const primary = settings[`${prefix}.alertText`]?.trim() ?? ""
  if (primary) {
    return { text: primary, type: settings[`${prefix}.alertType`] }
  }
  if (fallbackPrefix) {
    const fallback = settings[`${fallbackPrefix}.alertText`]?.trim() ?? ""
    if (fallback) {
      return { text: fallback, type: settings[`${fallbackPrefix}.alertType`] }
    }
  }
  return { text: "", type: settings[`${prefix}.alertType`] }
}
