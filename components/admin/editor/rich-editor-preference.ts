export type RichEditorVariant = "classic" | "blocks"

const PREFIX = "bustour.richEditor.variant:"

export function readRichEditorVariant(fieldName: string): RichEditorVariant {
  if (typeof window === "undefined") return "classic"
  try {
    const raw = window.localStorage.getItem(PREFIX + fieldName)
    return raw === "blocks" ? "blocks" : "classic"
  } catch {
    return "classic"
  }
}

export function writeRichEditorVariant(fieldName: string, variant: RichEditorVariant) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(PREFIX + fieldName, variant)
  } catch {
    /* ignore quota / private mode */
  }
}
