/**
 * Media folders: filter SQL + create/list/assign/delete (DB).
 * Run: npx tsx scripts/media-folders.selfcheck.ts
 */
import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { ensureDb } from "@/lib/db/init"
import { mediaFiles } from "@/lib/db/schema"
import { folderFilterSql, normalizeFolderName } from "@/lib/media/folders"
import {
  createMediaFolder,
  deleteMediaFolder,
  listMediaFolders,
} from "@/lib/media/folder-service"
import { mediaService } from "@/lib/media/service"
import { uploadFolderId } from "@/lib/media"

assert.equal(normalizeFolderName("  Tours  "), "Tours")
assert.equal(normalizeFolderName(""), null)
assert.equal(normalizeFolderName("x".repeat(81)), null)

assert.equal(folderFilterSql("all"), null)
assert.equal(folderFilterSql(undefined), null)
assert.deepEqual(folderFilterSql("root"), { sql: "folder_id IS NULL", args: [] })
assert.deepEqual(folderFilterSql("abc"), { sql: "folder_id = ?", args: ["abc"] })

assert.equal(uploadFolderId("all"), null)
assert.equal(uploadFolderId("root"), null)
assert.equal(uploadFolderId("folder-1"), "folder-1")

async function main() {
  await ensureDb()

  const stamp = Date.now()
  const folder = await createMediaFolder(`selfcheck-folders-${stamp}`)
  const folders = await listMediaFolders()
  assert.ok(folders.some((item) => item.id === folder.id))

  const fileId = randomUUID()
  await db.insert(mediaFiles).values({
    id: fileId,
    url: `/uploads/selfcheck-folders-${stamp}.jpg`,
    name: `selfcheck-folders-${stamp}.jpg`,
    size: "1 KB",
    type: "image",
    checksum: `selfcheck${stamp}`,
    folderId: folder.id,
    createdAt: stamp,
  })

  const inFolder = await mediaService.getAllMedia({ folder: folder.id })
  assert.ok(inFolder.some((item) => item.id === fileId))

  const rootOnly = await mediaService.getAllMedia({ folder: "root" })
  assert.ok(!rootOnly.some((item) => item.id === fileId))

  const moved = await mediaService.updateFolder(fileId, null)
  assert.equal(moved?.folderId, null)

  const deleted = await deleteMediaFolder(folder.id)
  assert.equal(deleted, true)
  assert.ok(!(await listMediaFolders()).some((item) => item.id === folder.id))

  await db.delete(mediaFiles).where(eq(mediaFiles.id, fileId))

  console.log("media-folders.selfcheck: ok")
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
