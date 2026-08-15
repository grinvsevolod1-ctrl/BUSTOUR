import path from "node:path"
import { createHash, randomUUID } from "node:crypto"
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises"
import { db, client } from "@/lib/db"
import { ensureDb } from "@/lib/db/init"
import { mediaFiles } from "@/lib/db/schema"
import { eq, inArray } from "drizzle-orm"
import { shouldReuseMedia } from "@/lib/media-dedupe"
import type { MediaItem, MediaProcessingStage, UploadedFile } from "@/lib/media-types"
import { isMediaReady, toUploadedFile } from "@/lib/media-types"
import { folderExists } from "@/lib/media-folder-service"
import { folderFilterSql } from "@/lib/media-folders"
import {
  extensionsByType,
  formatBytes,
  resolveUploadContentType,
  type MediaType,
  validateMediaMeta,
  MAX_MEDIA_SIZE_BYTES,
} from "@/lib/media-utils"
import { imageBytesForUpload } from "@/lib/media-webp"
import { videoBytesForUpload } from "@/lib/media-ffmpeg"
import { resolveUploadDiskPath, uploadsDirectory } from "@/lib/upload-fs"

export { MAX_MEDIA_SIZE_BYTES, MAX_MEDIA_SIZE_MB } from "@/lib/media-utils"

const uploadDirectory = uploadsDirectory()
const MEDIA_READY_POLL_MS = 1500
const MEDIA_READY_TIMEOUT_MS = 10 * 60_000
const MEDIA_WORKER_LEASE_MS = 2 * 60_000

export type MediaListFilters = {
  type?: string
  search?: string
  sort?: "createdAt:desc" | "createdAt:asc"
  /** `all` / omit = no filter; `root` = unfiled; else folder UUID */
  folder?: string
}

export type MediaWorkerJob = MediaItem & {
  checksum: string
  sourceUrl: string | null
  leaseUntil: number | null
}

type MediaRecordRow = {
  id: string
  url: string
  name: string
  size: string
  type: string
  altText?: string | null
  folderId?: string | null
  status?: string | null
  processingStage?: string | null
  errorMessage?: string | null
  mimeType?: string | null
  checksum?: string | null
  sourceUrl?: string | null
  leaseUntil?: number | null
}

type PendingMediaInput = {
  file: File
  folderId?: string | null
}

type MediaFinalizeInput = {
  url: string
  name: string
  size: string
  mimeType: string
}

export interface MediaService {
  saveFile(file: File, opts?: { folderId?: string | null }): Promise<MediaItem>
  waitForMediaReady(id: string, opts?: { timeoutMs?: number; pollMs?: number }): Promise<UploadedFile>
  getAllMedia(filters: MediaListFilters): Promise<MediaItem[]>
  getMediaById(id: string): Promise<MediaItem | null>
  findByChecksum(checksum: string): Promise<MediaItem | null>
  getAltTextByUrl(url: string): Promise<string | null>
  getDefaultAltsByMediaIds(ids: string[]): Promise<Map<string, string>>
  updateAlt(id: string, alt: string): Promise<MediaItem | null>
  updateFolder(id: string, folderId: string | null): Promise<MediaItem | null>
  deleteFile(id: string): Promise<boolean>
  claimNextProcessingMedia(leaseMs?: number): Promise<MediaWorkerJob | null>
  updateProcessingStage(id: string, stage: MediaProcessingStage): Promise<void>
  completeMediaProcessing(id: string, data: MediaFinalizeInput): Promise<MediaItem | null>
  failMediaProcessing(id: string, errorMessage: string): Promise<MediaItem | null>
  processMediaJob(job: MediaWorkerJob): Promise<MediaItem>
}

function diskExtension(name: string, type: MediaType): string {
  const extension = path.extname(name).toLowerCase()
  return extensionsByType[type].includes(extension) ? extension : extensionsByType[type][0]
}

export function validateMediaFile(file: File) {
  return validateMediaMeta(file.name, file.type, file.size, MAX_MEDIA_SIZE_BYTES)
}

function localUploadPath(url: string): string | null {
  return resolveUploadDiskPath(url, uploadDirectory)
}

async function storeBytes(params: {
  diskName: string
  bytes: Buffer
}): Promise<string> {
  await mkdir(uploadDirectory, { recursive: true })
  const filePath = path.join(uploadDirectory, params.diskName)
  await writeFile(filePath, params.bytes)
  return `/uploads/${params.diskName}`
}

async function removeStoredFile(url: string | null | undefined): Promise<void> {
  if (!url) return
  const filePath = localUploadPath(url)
  if (filePath) await unlink(filePath).catch(() => {})
}

function normalizeStatus(status: string | null | undefined): MediaItem["status"] {
  return status === "processing" || status === "failed" ? status : "ready"
}

function normalizeStage(stage: string | null | undefined, status: MediaItem["status"]): MediaProcessingStage {
  if (
    stage === "queued" ||
    stage === "processing" ||
    stage === "converting" ||
    stage === "finalizing" ||
    stage === "ready" ||
    stage === "failed"
  ) {
    return stage
  }
  if (status === "processing") return "queued"
  if (status === "failed") return "failed"
  return "ready"
}

function mapMediaItem(row: MediaRecordRow): MediaItem {
  const status = normalizeStatus(row.status)
  return {
    id: row.id,
    url: row.url,
    name: row.name,
    size: row.size,
    type: row.type as UploadedFile["type"],
    alt: row.altText ?? undefined,
    folderId: row.folderId ?? null,
    status,
    processingStage: normalizeStage(row.processingStage, status),
    errorMessage: row.errorMessage ?? null,
    mimeType: row.mimeType ?? "",
  }
}

function mapWorkerJob(row: MediaRecordRow): MediaWorkerJob {
  const item = mapMediaItem(row)
  return {
    ...item,
    checksum: row.checksum ?? "",
    sourceUrl: row.sourceUrl ?? null,
    leaseUntil: row.leaseUntil ?? null,
  }
}

const mediaSelect = {
  id: mediaFiles.id,
  url: mediaFiles.url,
  name: mediaFiles.name,
  size: mediaFiles.size,
  type: mediaFiles.type,
  altText: mediaFiles.altText,
  folderId: mediaFiles.folderId,
  status: mediaFiles.status,
  processingStage: mediaFiles.processingStage,
  errorMessage: mediaFiles.errorMessage,
  mimeType: mediaFiles.mimeType,
  checksum: mediaFiles.checksum,
  sourceUrl: mediaFiles.sourceUrl,
  leaseUntil: mediaFiles.leaseUntil,
} as const

async function resolveFolderId(folderId: string | null | undefined): Promise<string | null> {
  if (folderId == null || folderId === "" || folderId === "root") return null
  if (!(await folderExists(folderId))) throw new Error("Папка не найдена.")
  return folderId
}

function sanitizeWorkerError(message: string): string {
  const trimmed = message.replace(/\s+/g, " ").trim()
  return trimmed ? trimmed.slice(0, 300) : "Не удалось обработать файл."
}

async function createPendingMediaRecord({
  file,
  folderId: folderIdInput,
}: PendingMediaInput): Promise<MediaItem> {
  const validation = validateMediaFile(file)
  if (!validation.type) throw new Error(validation.error ?? "Недопустимый файл.")

  const bytes = Buffer.from(await file.arrayBuffer())
  const checksum = createHash("sha256").update(bytes).digest("hex")

  await ensureDb()
  const [existing] = await db
    .select(mediaSelect)
    .from(mediaFiles)
    .where(eq(mediaFiles.checksum, checksum))
    .limit(1)
  const existingItem = existing ? mapMediaItem(existing) : undefined
  if (shouldReuseMedia(existingItem)) return existingItem

  const folderId = await resolveFolderId(folderIdInput)
  const contentType = resolveUploadContentType(file.name, file.type, validation.type)
  const extension = diskExtension(file.name, validation.type)
  const diskName = `${randomUUID()}${extension}`
  const sourceUrl = await storeBytes({
    diskName,
    bytes,
  })
  const now = Date.now()
  const id = randomUUID()

  await db.insert(mediaFiles).values({
    id,
    url: sourceUrl,
    name: file.name,
    size: formatBytes(bytes.length),
    type: validation.type,
    checksum,
    altText: null,
    folderId,
    status: "processing",
    processingStage: "queued",
    errorMessage: null,
    mimeType: contentType,
    sourceUrl,
    leaseUntil: null,
    updatedAt: now,
    processedAt: null,
    createdAt: now,
  })

  return {
    id,
    url: sourceUrl,
    name: file.name,
    size: formatBytes(bytes.length),
    type: validation.type,
    folderId,
    status: "processing",
    processingStage: "queued",
    errorMessage: null,
    mimeType: contentType,
  }
}

async function saveFile(file: File, opts?: { folderId?: string | null }): Promise<MediaItem> {
  return createPendingMediaRecord({ file, folderId: opts?.folderId })
}

async function waitForMediaReady(
  id: string,
  opts?: { timeoutMs?: number; pollMs?: number },
): Promise<UploadedFile> {
  const timeoutAt = Date.now() + (opts?.timeoutMs ?? MEDIA_READY_TIMEOUT_MS)
  const pollMs = opts?.pollMs ?? MEDIA_READY_POLL_MS

  while (Date.now() < timeoutAt) {
    const item = await getMediaById(id)
    if (!item) throw new Error("Файл не найден.")
    if (item.status === "ready") return toUploadedFile(item)
    if (item.status === "failed") {
      throw new Error(item.errorMessage || "Не удалось обработать файл.")
    }
    await new Promise((resolve) => setTimeout(resolve, pollMs))
  }

  throw new Error("Сервер обрабатывает файл слишком долго. Проверьте медиатеку позже.")
}

async function getAllMedia(filters: MediaListFilters): Promise<MediaItem[]> {
  await ensureDb()
  const conditions: string[] = []
  const args: (string | number)[] = []
  if (filters.type) {
    conditions.push("type = ?")
    args.push(filters.type)
  }
  if (filters.search) {
    conditions.push("LOWER(name) LIKE LOWER(?)")
    args.push(`%${filters.search}%`)
  }
  const folderSql = folderFilterSql(filters.folder)
  if (folderSql) {
    conditions.push(folderSql.sql)
    args.push(...folderSql.args)
  }
  const where = conditions.length ? ` WHERE ${conditions.join(" AND ")}` : ""
  const order =
    filters.sort === "createdAt:asc" ? "ORDER BY created_at ASC" : "ORDER BY created_at DESC"
  const result = await client.execute({
    sql: `SELECT id, url, name, size, type, alt_text, folder_id, status, processing_stage, error_message, mime_type FROM media_files${where} ${order}`,
    args,
  })
  return result.rows.map((row) =>
    mapMediaItem({
      id: String(row.id),
      url: String(row.url),
      name: String(row.name),
      size: String(row.size),
      type: String(row.type),
      altText: row.alt_text == null ? null : String(row.alt_text),
      folderId: row.folder_id == null ? null : String(row.folder_id),
      status: row.status == null ? null : String(row.status),
      processingStage: row.processing_stage == null ? null : String(row.processing_stage),
      errorMessage: row.error_message == null ? null : String(row.error_message),
      mimeType: row.mime_type == null ? null : String(row.mime_type),
    }),
  )
}

async function getMediaById(id: string): Promise<MediaItem | null> {
  await ensureDb()
  const [row] = await db.select(mediaSelect).from(mediaFiles).where(eq(mediaFiles.id, id)).limit(1)
  return row ? mapMediaItem(row) : null
}

async function findByChecksum(checksum: string): Promise<MediaItem | null> {
  const hash = checksum.trim().toLowerCase()
  if (!/^[a-f0-9]{64}$/.test(hash)) return null
  await ensureDb()
  const [row] = await db
    .select(mediaSelect)
    .from(mediaFiles)
    .where(eq(mediaFiles.checksum, hash))
    .limit(1)
  return row ? mapMediaItem(row) : null
}

async function getAltTextByUrl(url: string): Promise<string | null> {
  const trimmed = url.trim()
  if (!trimmed) return null
  await ensureDb()
  const [row] = await db
    .select({ altText: mediaFiles.altText })
    .from(mediaFiles)
    .where(eq(mediaFiles.url, trimmed))
    .limit(1)
  const alt = row?.altText?.trim()
  return alt || null
}

async function getDefaultAltsByMediaIds(ids: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter(Boolean))]
  const map = new Map<string, string>()
  if (!unique.length) return map
  await ensureDb()
  const rows = await db
    .select({ id: mediaFiles.id, altText: mediaFiles.altText })
    .from(mediaFiles)
    .where(inArray(mediaFiles.id, unique))
  for (const row of rows) {
    if (row.altText?.trim()) map.set(row.id, row.altText.trim())
  }
  return map
}

async function updateAlt(id: string, alt: string): Promise<MediaItem | null> {
  await ensureDb()
  const existing = await getMediaById(id)
  if (!existing) return null
  if (!isMediaReady(existing)) {
    throw new Error("Нельзя изменить alt, пока файл ещё обрабатывается.")
  }
  const trimmed = alt.trim()
  await db.update(mediaFiles).set({ altText: trimmed || null }).where(eq(mediaFiles.id, id))
  return getMediaById(id)
}

async function updateFolder(id: string, folderId: string | null): Promise<MediaItem | null> {
  await ensureDb()
  const existing = await getMediaById(id)
  if (!existing) return null
  const nextFolderId = await resolveFolderId(folderId)
  await db.update(mediaFiles).set({ folderId: nextFolderId }).where(eq(mediaFiles.id, id))
  return getMediaById(id)
}

async function deleteFile(id: string): Promise<boolean> {
  await ensureDb()
  const result = await client.execute({
    sql: "SELECT url, source_url, status FROM media_files WHERE id = ? LIMIT 1",
    args: [id],
  })
  const row = result.rows[0]
  if (!row) return false
  const status = String(row.status ?? "ready")
  if (status === "processing") {
    throw new Error("Файл ещё обрабатывается. Удаление станет доступно после завершения или ошибки.")
  }

  await removeStoredFile(row.url == null ? null : String(row.url))
  const sourceUrl = row.source_url == null ? null : String(row.source_url)
  if (sourceUrl && sourceUrl !== row.url) {
    await removeStoredFile(sourceUrl)
  }
  const deleted = await client.execute({
    sql: "DELETE FROM media_files WHERE id = ?",
    args: [id],
  })
  return Number(deleted.rowsAffected ?? 0) > 0
}

async function claimNextProcessingMedia(leaseMs = MEDIA_WORKER_LEASE_MS): Promise<MediaWorkerJob | null> {
  await ensureDb()
  const now = Date.now()
  const leaseUntil = now + leaseMs
  const result = await client.execute({
    sql: `
      WITH candidate AS (
        SELECT id
        FROM media_files
        WHERE status = 'processing'
          AND (lease_until IS NULL OR lease_until < ?)
        ORDER BY created_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      )
      UPDATE media_files AS m
      SET lease_until = ?,
          updated_at = ?,
          processing_stage = CASE
            WHEN m.processing_stage = 'queued' THEN 'processing'
            ELSE m.processing_stage
          END,
          error_message = NULL
      FROM candidate
      WHERE m.id = candidate.id
      RETURNING m.id, m.url, m.name, m.size, m.type, m.alt_text, m.folder_id, m.status, m.processing_stage,
                m.error_message, m.mime_type, m.checksum, m.source_url, m.lease_until
    `,
    args: [now, leaseUntil, now],
  })
  const row = result.rows[0]
  return row
    ? mapWorkerJob({
        id: String(row.id),
        url: String(row.url),
        name: String(row.name),
        size: String(row.size),
        type: String(row.type),
        altText: row.alt_text == null ? null : String(row.alt_text),
        folderId: row.folder_id == null ? null : String(row.folder_id),
        status: row.status == null ? null : String(row.status),
        processingStage: row.processing_stage == null ? null : String(row.processing_stage),
        errorMessage: row.error_message == null ? null : String(row.error_message),
        mimeType: row.mime_type == null ? null : String(row.mime_type),
        checksum: row.checksum == null ? null : String(row.checksum),
        sourceUrl: row.source_url == null ? null : String(row.source_url),
        leaseUntil: row.lease_until == null ? null : Number(row.lease_until),
      })
    : null
}

async function updateProcessingStage(id: string, stage: MediaProcessingStage): Promise<void> {
  await ensureDb()
  await db
    .update(mediaFiles)
    .set({
      processingStage: stage,
      updatedAt: Date.now(),
    })
    .where(eq(mediaFiles.id, id))
}

async function completeMediaProcessing(id: string, data: MediaFinalizeInput): Promise<MediaItem | null> {
  await ensureDb()
  const existing = await getMediaById(id)
  if (!existing) return null
  await db
    .update(mediaFiles)
    .set({
      url: data.url,
      name: data.name,
      size: data.size,
      mimeType: data.mimeType,
      status: "ready",
      processingStage: "ready",
      errorMessage: null,
      sourceUrl: null,
      leaseUntil: null,
      updatedAt: Date.now(),
      processedAt: Date.now(),
    })
    .where(eq(mediaFiles.id, id))
  return getMediaById(id)
}

async function failMediaProcessing(id: string, errorMessage: string): Promise<MediaItem | null> {
  await ensureDb()
  await db
    .update(mediaFiles)
    .set({
      status: "failed",
      processingStage: "failed",
      errorMessage: sanitizeWorkerError(errorMessage),
      leaseUntil: null,
      updatedAt: Date.now(),
    })
    .where(eq(mediaFiles.id, id))
  return getMediaById(id)
}

async function processMediaJob(job: MediaWorkerJob): Promise<MediaItem> {
  const sourceUrl = job.sourceUrl || job.url
  const sourcePath = localUploadPath(sourceUrl)
  if (!sourcePath) {
    const failed = await failMediaProcessing(job.id, "Исходный файл не найден на диске.")
    if (!failed) throw new Error("Файл обработки не найден.")
    return failed
  }

  const bytes = await readFile(sourcePath)
  const extension = diskExtension(job.name, job.type)
  const originalMime = job.mimeType || resolveUploadContentType(job.name, "", job.type)

  try {
    await updateProcessingStage(job.id, "converting")

    let next: {
      bytes: Buffer
      contentType: string
      ext: string
      name: string
    } = {
      bytes,
      contentType: originalMime,
      ext: extension,
      name: job.name,
    }

    if (job.type === "image") {
      next = await imageBytesForUpload(bytes, job.name, originalMime, extension)
    } else if (job.type === "video") {
      next = await videoBytesForUpload(bytes, job.name, originalMime, extension)
    }

    if (next.bytes.length > MAX_MEDIA_SIZE_BYTES) {
      throw new Error(`После обработки размер превышает ${formatBytes(MAX_MEDIA_SIZE_BYTES)}.`)
    }

    await updateProcessingStage(job.id, "finalizing")

    let finalUrl = sourceUrl
    if (
      next.name !== job.name ||
      next.contentType !== originalMime ||
      next.bytes.length !== bytes.length ||
      !Buffer.from(next.bytes).equals(bytes)
    ) {
      const finalUrlCandidate = await storeBytes({
        diskName: `${randomUUID()}${next.ext}`,
        bytes: next.bytes,
      })
      finalUrl = finalUrlCandidate
    }

    const ready = await completeMediaProcessing(job.id, {
      url: finalUrl,
      name: next.name,
      size: formatBytes(next.bytes.length),
      mimeType: next.contentType,
    })
    if (!ready) throw new Error("Не удалось обновить запись медиатеки.")

    if (sourceUrl && sourceUrl !== finalUrl) {
      await removeStoredFile(sourceUrl)
    }

    return ready
  } catch (error) {
    const failed = await failMediaProcessing(
      job.id,
      error instanceof Error ? error.message : "Не удалось обработать файл.",
    )
    if (!failed) throw error
    return failed
  }
}

export const mediaService: MediaService = {
  saveFile,
  waitForMediaReady,
  getAllMedia,
  getMediaById,
  findByChecksum,
  getAltTextByUrl,
  getDefaultAltsByMediaIds,
  updateAlt,
  updateFolder,
  deleteFile,
  claimNextProcessingMedia,
  updateProcessingStage,
  completeMediaProcessing,
  failMediaProcessing,
  processMediaJob,
}

export {
  saveFile,
  waitForMediaReady,
  getAllMedia,
  getMediaById,
  findByChecksum,
  getAltTextByUrl,
  getDefaultAltsByMediaIds,
  updateAlt,
  updateFolder,
  deleteFile,
  claimNextProcessingMedia,
  updateProcessingStage,
  completeMediaProcessing,
  failMediaProcessing,
  processMediaJob,
}
