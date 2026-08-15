const SHORTCODE_TOKEN = /\[([a-zA-Z0-9]+)\]/g

/** Built-in shortcodes always present on public render (`[Y]` = calendar year). */
export function withBuiltinShortcodes(dict: Record<string, string>): Record<string, string> {
  return {
    ...dict,
    Y: String(new Date().getFullYear()),
  }
}

/** Replace `[Name]` tokens using dict keyed by bare name (no brackets). Client-safe (no DB). */
export function parseShortcodes(text: string, shortcodesDict: Record<string, string>): string {
  if (!text) return text
  return text.replace(SHORTCODE_TOKEN, (full, name: string) =>
    Object.prototype.hasOwnProperty.call(shortcodesDict, name) ? shortcodesDict[name]! : full,
  )
}
