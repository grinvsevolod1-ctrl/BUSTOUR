"use client"

import { GripVertical } from "lucide-react"

export function DragHandle({ label }: { label: string }) {
  return (
    <span
      className="grid h-8 w-6 shrink-0 cursor-grab place-items-center rounded text-admin-fg-subtle transition-colors hover:bg-admin-muted hover:text-admin-fg active:cursor-grabbing"
      title="Перетащить"
      aria-hidden="true"
    >
      <GripVertical className="h-4 w-4" aria-hidden="true" />
    </span>
  )
}