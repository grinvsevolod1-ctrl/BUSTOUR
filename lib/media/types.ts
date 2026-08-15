import type { MediaType } from "@/lib/media/utils"

export interface UploadedFile {
  id: string
  url: string
  name: string
  size: string
  type: MediaType
  /** Library default alt (`media_files.alt_text`) when known. */
  alt?: string
  /** Per-page override for cover/gallery bindings. */
  customAlt?: string
  /** Flat folder id; null/undefined = root (unfiled). */
  folderId?: string | null
}

export type MediaStatus = "processing" | "ready" | "failed"
export type MediaProcessingStage =
  | "queued"
  | "processing"
  | "converting"
  | "finalizing"
  | "ready"
  | "failed"

export interface MediaItem extends UploadedFile {
  status: MediaStatus
  processingStage: MediaProcessingStage
  errorMessage?: string | null
  mimeType?: string
}

export function isMediaReady(file: UploadedFile | MediaItem): boolean {
  return !("status" in file) || file.status === "ready"
}

export function toUploadedFile(file: UploadedFile | MediaItem): UploadedFile {
  return {
    id: file.id,
    url: file.url,
    name: file.name,
    size: file.size,
    type: file.type,
    alt: file.alt,
    customAlt: file.customAlt,
    folderId: file.folderId,
  }
}
