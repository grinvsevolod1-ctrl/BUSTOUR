import type { ContentBlock } from "@/lib/types"

export function getBlockLabel(b: ContentBlock): string {
  const ex = b.extra as Record<string, unknown>
  if (b.title) return b.title
  if (Array.isArray(ex?.columns)) {
    const cols = (ex.columns as unknown[]).map(String)
    return cols.slice(0, 2).join(", ") || `Таблица #${b.id}`
  }
  return `Таблица #${b.id}`
}
