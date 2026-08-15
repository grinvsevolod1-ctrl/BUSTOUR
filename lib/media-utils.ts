export type MediaType = "image" | "video" | "document"

/** Public upload ceiling (bytes / MB). Keep in sync with server validateMediaFile. */
export const MAX_MEDIA_SIZE_MB = 200
export const MAX_MEDIA_SIZE_BYTES = MAX_MEDIA_SIZE_MB * 1024 * 1024

/** Max output height for image/video normalize (no upscale). */
export const MEDIA_MAX_HEIGHT_PX = 1080

export const extensionsByType: Record<MediaType, string[]> = {
  image: [".jpg", ".jpeg", ".png", ".webp"],
  video: [".mp4", ".webm"],
  document: [".pdf", ".xlsx", ".xls", ".docx", ".doc", ".txt"],
}

export const mimeTypesByType: Record<MediaType, string[]> = {
  image: ["image/jpeg", "image/png", "image/webp"],
  video: ["video/mp4", "video/webm"],
  document: [
    "application/pdf",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
  ],
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function extToType(filename: string): MediaType | null {
  const extension = filename.slice(filename.lastIndexOf(".")).toLowerCase()
  return (
    (Object.entries(extensionsByType).find(([, extensions]) => extensions.includes(extension))?.[0] as
      | MediaType
      | undefined) ?? null
  )
}

export function detectType(
  input: string | { name: string; type?: string },
): MediaType | null {
  const name = typeof input === "string" ? input : input.name
  const extensionType = extToType(name)
  if (extensionType) return extensionType

  const mime = typeof input === "string" ? "" : input.type?.toLowerCase() ?? ""
  return (
    (Object.entries(mimeTypesByType).find(([, mimes]) => mimes.includes(mime))?.[0] as
      | MediaType
      | undefined) ?? null
  )
}

export function validateMediaMeta(
  name: string,
  mime: string,
  size: number,
  maxSizeBytes: number,
): { type: MediaType | null; error?: string } {
  if (size > maxSizeBytes) {
    return { type: null, error: `Размер файла не должен превышать ${formatBytes(maxSizeBytes)}.` }
  }
  const type = detectType({ name, type: mime })
  return type
    ? { type }
    : { type: null, error: "Поддерживаются только изображения, видео и документы разрешённых форматов." }
}

/**
 * Blob/`<video>` need a real MIME. Empty or `application/octet-stream` from some
 * browsers leaves objects unplayable while images often still sniff OK.
 */
const mimeByExtension: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".pdf": "application/pdf",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".xls": "application/vnd.ms-excel",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".doc": "application/msword",
  ".txt": "text/plain",
}

export function resolveUploadContentType(name: string, mime: string, type: MediaType): string {
  const normalized = mime.trim().toLowerCase()
  if (mimeTypesByType[type].includes(normalized)) return normalized
  const ext = name.slice(name.lastIndexOf(".")).toLowerCase()
  if (mimeByExtension[ext]) return mimeByExtension[ext]!
  return mimeTypesByType[type][0]!
}
