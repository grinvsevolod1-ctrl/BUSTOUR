/**
 * Browser-only: resize (max height 1080, no upscale) + encode image → WebP.
 * Used when server sharp is skipped (MEDIA_SKIP_WEBP / old CPU).
 */
import { MEDIA_MAX_HEIGHT_PX } from "@/lib/media-utils"

export async function encodeImageFileToWebp(file: File, quality = 0.9): Promise<File> {
  if (!file.type.startsWith("image/")) return file
  if (file.type === "image/gif") return file

  if (typeof createImageBitmap !== "function" || typeof document === "undefined") {
    return file
  }

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    return file
  }

  try {
    let { width, height } = bitmap
    if (height > MEDIA_MAX_HEIGHT_PX) {
      const scale = MEDIA_MAX_HEIGHT_PX / height
      width = Math.max(1, Math.round(width * scale))
      height = MEDIA_MAX_HEIGHT_PX
    }

    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext("2d")
    if (!ctx) return file
    ctx.drawImage(bitmap, 0, 0, width, height)

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), "image/webp", quality)
    })
    if (!blob || blob.size === 0) return file

    const base = file.name.replace(/\.[^.]+$/, "") || "image"
    return new File([blob], `${base}.webp`, { type: "image/webp", lastModified: Date.now() })
  } finally {
    bitmap.close()
  }
}
