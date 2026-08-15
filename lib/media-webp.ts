/**
 * Image normalize for upload: max height 1080 (no upscale) → WebP near-lossless.
 * Falls back to original when sharp unavailable / MEDIA_SKIP_WEBP.
 */
import { MEDIA_MAX_HEIGHT_PX } from "@/lib/media-utils"

export { MEDIA_MAX_HEIGHT_PX }

export type WebpResult = {
  bytes: Buffer
  contentType: "image/webp"
  ext: ".webp"
  name: string
}

function webpName(originalName: string): string {
  const base = originalName.replace(/\.[^.]+$/, "") || "image"
  return `${base}.webp`
}

function skipWebp(): boolean {
  const v = (process.env.MEDIA_SKIP_WEBP || "").trim().toLowerCase()
  return v === "1" || v === "true" || v === "yes"
}

/** Resize so height ≤ MEDIA_MAX_HEIGHT_PX (no upscale), then near-lossless WebP. */
export async function imageBytesToWebp(bytes: Buffer, originalName: string): Promise<WebpResult> {
  const sharp = (await import("sharp")).default
  const out = await sharp(bytes)
    .rotate()
    .resize({
      height: MEDIA_MAX_HEIGHT_PX,
      withoutEnlargement: true,
    })
    // ponytail: nearLossless ≈ visually lossless; switch to lossless if size budget allows
    .webp({ nearLossless: true, quality: 90 })
    .toBuffer()
  return {
    bytes: Buffer.from(out.buffer, out.byteOffset, out.byteLength),
    contentType: "image/webp",
    ext: ".webp",
    name: webpName(originalName),
  }
}

/**
 * WebP+resize when sharp works; otherwise keep original.
 * MEDIA_SKIP_WEBP=1 skips sharp entirely.
 */
export async function imageBytesForUpload(
  bytes: Buffer,
  originalName: string,
  originalContentType: string,
  originalExt: string,
): Promise<{ bytes: Buffer; contentType: string; ext: string; name: string }> {
  const original = {
    bytes,
    contentType: originalContentType || "application/octet-stream",
    ext: originalExt,
    name: originalName,
  }
  if (skipWebp()) return original
  try {
    return await imageBytesToWebp(bytes, originalName)
  } catch (err) {
    console.error("[media-webp] sharp failed, keeping original image", err)
    return original
  }
}
