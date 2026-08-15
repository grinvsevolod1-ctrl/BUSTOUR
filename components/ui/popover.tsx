"use client"

import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export function Popover({ children }: { children: ReactNode }) {
  return <div className="relative">{children}</div>
}

export function PopoverTrigger({ children }: { children: ReactNode }) {
  return <>{children}</>
}

export function PopoverContent({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("absolute left-0 top-full z-30 mt-2 w-full rounded border border-line bg-white p-3 shadow-lg", className)}>
      {children}
    </div>
  )
}
