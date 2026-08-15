import { eq, like, or, sql } from "drizzle-orm"
import { db, type DbExecutor } from "@/lib/db"
import { settings, contentBlocks } from "@/lib/db/schema"
import { ensureDb } from "@/lib/db/init"

/**
 * Remap one settings key when a page scope slug changes.
 * Returns null if key is outside `oldPageKey` / `oldPageKey.*`.
 * Rejects longer siblings (`old` must not match `old-extra`).
 */
export function remapPageScopedSettingKey(
  key: string,
  oldPageKey: string,
  newPageKey: string,
): string | null {
  if (!oldPageKey || !newPageKey || oldPageKey === newPageKey) return null
  if (key === oldPageKey) return newPageKey
  const prefix = `${oldPageKey}.`
  if (!key.startsWith(prefix)) return null
  return `${newPageKey}.${key.slice(prefix.length)}`
}

/**
 * Move settings keys + content_blocks.page from oldPageKey → newPageKey.
 * Destination keys/blocks under newPageKey are removed first (old content wins).
 */
export async function rekeyPageScopedContent(oldPageKey: string, newPageKey: string, executor: DbExecutor = db): Promise<void> {
  if (!oldPageKey || !newPageKey || oldPageKey === newPageKey) return
  if (executor === db) await ensureDb()
  const [settingsCollision] = await executor.select({ key: settings.key }).from(settings).where(or(eq(settings.key, newPageKey), like(settings.key, `${newPageKey}.%`))).limit(1)
  const [blocksCollision] = await executor.select({ id: contentBlocks.id }).from(contentBlocks).where(eq(contentBlocks.page, newPageKey)).limit(1)
  if (settingsCollision || blocksCollision) {
    throw new Error(`Область страницы «${newPageKey}» уже содержит настройки или контент. Выберите другой slug.`)
  }
  await executor.update(settings).set({ key: sql`${newPageKey} || substr(${settings.key}, ${oldPageKey.length + 1})` }).where(or(eq(settings.key, oldPageKey), like(settings.key, `${oldPageKey}.%`)))
  await executor.update(contentBlocks).set({ page: newPageKey }).where(eq(contentBlocks.page, oldPageKey))
}
/** Delete settings + blocks for a page scope (orphan leftover after rename/delete). */
export async function deletePageScopedContent(pageKey: string): Promise<void> {
  if (!pageKey) return
  await ensureDb()
  await db
    .delete(settings)
    .where(or(eq(settings.key, pageKey), like(settings.key, `${pageKey}.%`)))
  await db.delete(contentBlocks).where(eq(contentBlocks.page, pageKey))
}
