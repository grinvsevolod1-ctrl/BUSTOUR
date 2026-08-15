"use client"

import { FileSpreadsheet, FileText, FileType2 } from "lucide-react"
import type { UploadedFile } from "@/components/admin/media-uploader"
import { cn } from "@/lib/utils"

function documentIcon(name: string) {
  const extension = name.slice(name.lastIndexOf(".")).toLowerCase()
  if (extension === ".pdf") return { Icon: FileText, className: "text-red-600" }
  if (extension === ".xls" || extension === ".xlsx") {
    return { Icon: FileSpreadsheet, className: "text-green-600" }
  }
  if (extension === ".doc" || extension === ".docx") {
    return { Icon: FileType2, className: "text-blue-600" }
  }
  return { Icon: FileText, className: "text-admin-fg-subtle" }
}

export function MediaThumbnail({ file }: { file: UploadedFile }) {
  if (file.type === "image") {
    return (
      <>
        <img src={file.url} alt={file.alt || file.name} className="h-24 w-full object-cover" />
        <div className="truncate px-3 py-2 text-xs text-admin-fg-muted">
          {file.name} ({file.size})
        </div>
      </>
    )
  }

  if (file.type === "video") {
    return (
      <>
        <video
          src={file.url}
          muted
          playsInline
          className="h-24 w-full object-cover"
          onMouseEnter={(event) => void event.currentTarget.play()}
          onMouseLeave={(event) => {
            event.currentTarget.pause()
            event.currentTarget.currentTime = 0
          }}
        />
        <div className="truncate px-3 py-2 text-xs text-admin-fg-muted">
          {file.name} ({file.size})
        </div>
      </>
    )
  }

  const { Icon, className } = documentIcon(file.name)
  return (
    <div className="flex h-24 items-center gap-3 px-4">
      <Icon className={cn("h-8 w-8 shrink-0", className)} />
      <p className="min-w-0 truncate text-xs text-admin-fg-muted">
        {file.name} ({file.size})
      </p>
    </div>
  )
}
