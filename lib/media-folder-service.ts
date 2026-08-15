/** Flat media folders CRUD (DB). Pure helpers: `@/lib/media-folders`. */

import { randomUUID } from "node:crypto"
import { eq } from "drizzle-orm"
import { db, client } from "@/lib/db"
import { ensureDb } from "@/lib/db/init"
import { mediaFolders, mediaFiles } from "@/lib/db/schema"
import { normalizeFolderName, type MediaFolder } from "@/lib/media-folders"

export type { MediaFolder }

export async function listMediaFolders(): Promise<MediaFolder[]> {
  await ensureDb()
  const rows = await db
    .select({
      id: mediaFolders.id,
      name: mediaFolders.name,
      createdAt: mediaFolders.createdAt,
    })
    .from(mediaFolders)
    .orderBy(mediaFolders.name)
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    createdAt: row.createdAt,
  }))
}

export async function createMediaFolder(rawName: string): Promise<MediaFolder> {
  const name = normalizeFolderName(rawName)
  if (!name) throw new Error("Укажите название папки (1–80 символов).")
  await ensureDb()
  const id = randomUUID()
  const createdAt = Date.now()
  try {
    await db.insert(mediaFolders).values({ id, name, createdAt })
  } catch {
    throw new Error(`Папка «${name}» уже существует.`)
  }
  return { id, name, createdAt }
}

export async function deleteMediaFolder(id: string): Promise<boolean> {
  await ensureDb()
  const [existing] = await db
    .select({ id: mediaFolders.id })
    .from(mediaFolders)
    .where(eq(mediaFolders.id, id))
    .limit(1)
  if (!existing) return false
  // Unfile media, then drop folder (no cascade FK).
  await db.update(mediaFiles).set({ folderId: null }).where(eq(mediaFiles.folderId, id))
  await db.delete(mediaFolders).where(eq(mediaFolders.id, id))
  return true
}

export async function folderExists(id: string): Promise<boolean> {
  await ensureDb()
  const result = await client.execute({
    sql: "SELECT 1 FROM media_folders WHERE id = ? LIMIT 1",
    args: [id],
  })
  return result.rows.length > 0
}
