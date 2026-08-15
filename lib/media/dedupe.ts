import type { MediaItem, UploadedFile } from "@/lib/media/types"

export function shouldReuseMedia(
  existing: UploadedFile | MediaItem | undefined,
): existing is UploadedFile | MediaItem {
  return Boolean(existing && (!("status" in existing) || existing.status !== "failed"))
}
