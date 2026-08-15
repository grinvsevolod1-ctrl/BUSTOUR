"use client"

import { useState } from "react"
import {
  MediaUploader,
  uploadedFileFromUrl,
  type MediaType,
  type UploadedFile,
} from "@/components/admin/media-uploader"
import { Label } from "@/components/admin/ui"

export function SettingMediaField({
  name,
  label,
  value = "",
  required = false,
  form,
  accept = ["image"],
}: {
  name: string
  label: string
  value?: string
  required?: boolean
  form?: string
  accept?: MediaType[]
}) {
  const [file, setFile] = useState<UploadedFile | null>(
    value ? uploadedFileFromUrl(value) : null,
  )

  return (
    <>
      <input
        type={required ? "text" : "hidden"}
        name={name}
        form={form}
        value={file?.url ?? ""}
        className={required ? "sr-only" : undefined}
        aria-label={label}
        required={required}
        readOnly
      />
      <Label required={required}>{label}</Label>
      <MediaUploader
        value={file}
        onChange={setFile}
        accept={accept}
        altMode="library"
      />
    </>
  )
}
