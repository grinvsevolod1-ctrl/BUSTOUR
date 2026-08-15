import type { UploadedFile } from "@/components/admin/media-uploader"

/** Remove one gallery slot by index (same media.id may appear twice after checksum dedupe). */
export function removeMediaAt(list: UploadedFile[], index: number): UploadedFile[] {
  if (index < 0 || index >= list.length) return list
  return list.filter((_, i) => i !== index)
}

/** Patch one gallery slot by index (do not match on media.id — duplicates share id). */
export function patchMediaAt(list: UploadedFile[], index: number, next: UploadedFile): UploadedFile[] {
  if (index < 0 || index >= list.length) return list
  return list.map((item, i) => (i === index ? next : item))
}

/** Reorder gallery slot from `from` to `to` (index-based; ids may duplicate). */
export function moveMediaAt(list: UploadedFile[], from: number, to: number): UploadedFile[] {
  if (from === to) return list
  if (from < 0 || from >= list.length || to < 0 || to >= list.length) return list
  const next = [...list]
  const [moved] = next.splice(from, 1)
  if (!moved) return list
  next.splice(to, 0, moved)
  return next
}
