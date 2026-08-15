import { expandShortcodes } from "@/lib/shortcodes"

/** Server Component: expand `[Shortcodes]` in plain text (H1, labels). */
export async function ParsedText({ text }: { text: string }) {
  return <>{await expandShortcodes(text)}</>
}
