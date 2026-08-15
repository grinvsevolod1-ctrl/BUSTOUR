"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

export function CollapsibleCard({
  title,
  subtitle,
  defaultOpen = true,
  children,
}: {
  title: string
  subtitle?: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="rounded-lg border border-admin-border bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex w-full items-center gap-2 px-4 py-2.5 text-left transition-colors hover:bg-admin-muted/40",
          open && "border-b border-admin-border",
        )}
      >
        <ChevronDown className={cn(
          "h-4 w-4 shrink-0 text-admin-fg-muted transition-transform",
          !open && "-rotate-90",
        )} />
        <span className="text-sm font-semibold text-admin-fg">{title}</span>
        {subtitle && (
          <span className="ml-1 text-xs text-admin-fg-muted">{subtitle}</span>
        )}
      </button>

      {open && (
        <div className="p-4">
          {children}
        </div>
      )}
    </div>
  )
}
