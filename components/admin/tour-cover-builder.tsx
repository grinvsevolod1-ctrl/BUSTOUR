"use client"

import { useState } from "react"
import {
  MediaUploader,
  type UploadedFile,
} from "@/components/admin/media-uploader"
import { Label } from "@/components/admin/ui"
import {
  coerceMediaNode,
  isMediaLibraryId,
  serializeMediaNode,
  type MediaNode,
} from "@/lib/media/node"
import { extToType } from "@/lib/media/utils"

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

export function TourCoverBuilder({
  image = "",
  cover,
  required = false,
}: {
  image?: string
  cover?: MediaNode | null
  required?: boolean
}) {
  const initial = cover ?? coerceMediaNode(image)
  const [file, setFile] = useState<UploadedFile | null>(
    initial ? uploadedFileFromMediaNode(initial) : null,
  )

  return (
    <div className="space-y-3">
      <input
        type={required ? "text" : "hidden"}
        name="image"
        value={file ? serializeMediaNode(mediaNodeFromUploadedFile(file)) : ""}
        className={required ? "sr-only" : undefined}
        aria-label="Обложка тура"
        required={required}
        readOnly
      />
      <Label required={required}>Обложка тура</Label>
      <MediaUploader
        value={file}
        onChange={setFile}
        accept={["image"]}
        altMode="instance"
      />
    </div>
  )
}
