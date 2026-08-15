import { cache } from "react"
import { asc, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { shortcodes } from "@/lib/db/schema"
import { ensureDb } from "@/lib/db/init"
import { parseShortcodes, withBuiltinShortcodes } from "@/lib/parse-shortcodes"

export { parseShortcodes, withBuiltinShortcodes }

export type ShortcodeRow = {
  id: number
  name: string
  value: string
  description: string | null
}

export async function listShortcodes(): Promise<ShortcodeRow[]> {
  await ensureDb()
  return db
    .select({
      id: shortcodes.id,
      name: shortcodes.name,
      value: shortcodes.value,
      description: shortcodes.description,
    })
    .from(shortcodes)
    .orderBy(asc(shortcodes.name))
}

/** Per-request cached map name → value for public render. */
export const getShortcodesDict = cache(async (): Promise<Record<string, string>> => {
  const rows = await listShortcodes()
  return withBuiltinShortcodes(Object.fromEntries(rows.map((r) => [r.name, r.value])))
})

/** Server helper: load dict (React cache) and expand shortcodes in plain text. */
export async function expandShortcodes(text: string): Promise<string> {
  if (!text || !text.includes("[")) return text
  return parseShortcodes(text, await getShortcodesDict())
}
export async function getShortcodeById(id: number): Promise<ShortcodeRow | null> {
  await ensureDb()
  const [row] = await db
    .select({
      id: shortcodes.id,
      name: shortcodes.name,
      value: shortcodes.value,
      description: shortcodes.description,
    })
    .from(shortcodes)
    .where(eq(shortcodes.id, id))
    .limit(1)
  return row ?? null
}
