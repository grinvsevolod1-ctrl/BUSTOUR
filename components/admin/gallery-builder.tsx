"use client"

import { useState } from "react"
import {
  MediaUploader,
  uploadedFileFromUrl,
  type UploadedFile,
} from "@/components/admin/media-uploader"
import {
  coerceMediaNodeList,
  isMediaLibraryId,
  serializeMediaNodeList,
  type MediaNode,
} from "@/lib/media-node"
import { extToType } from "@/lib/media-utils"

function uploadedFileFromMediaNode(node: MediaNode): UploadedFile {
  const cleanUrl = node.url.split(/[?#]/, 1)[0]
  const rawName = cleanUrl.slice(cleanUrl.lastIndexOf("/") + 1)
  let name = rawName || "Медиа"
  try {
    name = decodeURIComponent(name)
  } catch {
    // keep raw
  }
  return {
    id: node.mediaId || node.url,
    url: node.url,
    name,
    size: "",
    type: extToType(cleanUrl) ?? "image",
    customAlt: node.customAlt,
  }
}

function mediaNodeFromUploadedFile(file: UploadedFile): MediaNode {
  const node: MediaNode = { url: file.url }
  if (isMediaLibraryId(file.id)) node.mediaId = file.id
  if (file.customAlt?.trim()) node.customAlt = file.customAlt.trim()
  return node
}

export function GalleryBuilder({
  images: initial = [],
}: {
  images?: MediaNode[] | string[]
}) {
  const [images, setImages] = useState<UploadedFile[]>(() =>
    coerceMediaNodeList(initial).map(uploadedFileFromMediaNode),
  )

  return (
    <div className="space-y-3">
      <input
        type="hidden"
        name="gallery"
        value={serializeMediaNodeList(images.map(mediaNodeFromUploadedFile))}
      />
      <MediaUploader
        mode="multiple"
        value={images}
        onChange={setImages}
        accept={["image", "video"]}
        label="Медиа галереи"
        altMode="instance"
      />
      <p className="text-xs text-admin-fg-subtle">
        Первое медиа — главное. Порядок меняется перетаскиванием или стрелками. Если список пуст,
        используется основное изображение. Alt на карточке — только для этой страницы; Alt по
        умолчанию правится в медиатеке.
      </p>
    </div>
  )
}

/** @deprecated legacy helper kept for non-gallery URL-only fields */
export { uploadedFileFromUrl }
