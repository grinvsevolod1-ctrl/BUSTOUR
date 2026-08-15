import { cn } from "@/lib/utils"
import { getShortcodesDict, parseShortcodes } from "@/lib/shortcodes"
import { sanitizeCmsHtml } from "@/lib/sanitize-html"

// Renders trusted admin-authored HTML (Tiptap output). Content is sanitized
// with an allowlist before rendering to prevent any accidental stored XSS
// even if the CMS input were ever compromised.
// Applies global shortcodes: `[Y]` → current year.
export async function RichContent({ html, className }: { html?: string | null; className?: string }) {
  if (!html || !html.trim()) return null
  const dict = await getShortcodesDict()
  const parsed = parseShortcodes(html, dict)
  return <div className={cn("prose-content", className)} dangerouslySetInnerHTML={{ __html: sanitizeCmsHtml(parsed) }} />
}
