"use client"

import { DayPicker, type DayPickerProps } from "react-day-picker"
import { ru } from "date-fns/locale/ru"
import "react-day-picker/style.css"
import { cn } from "@/lib/utils"

export function Calendar({ className, locale = ru, ...props }: DayPickerProps) {
  return (
    <DayPicker
      locale={locale}
      className={cn("text-ink", className)}
      classNames={{
        root: "rdp text-ink",
        months: "flex flex-col gap-4 md:flex-row",
        month_caption: "mb-2 text-center text-sm font-semibold text-ink capitalize",
        weekdays: "grid grid-cols-7 text-xs font-semibold text-ink-muted",
        weekday: "py-1 text-center",
        week: "grid grid-cols-7 gap-1",
        day: "h-10 w-10 rounded text-sm transition-colors hover:bg-cream aria-selected:bg-brand aria-selected:font-bold aria-selected:text-white",
        selected: "bg-brand font-bold text-white",
        range_middle: "bg-brand/10 text-ink",
        disabled: "cursor-not-allowed text-ink-muted/35 hover:bg-transparent",
        today: "ring-1 ring-brand/40",
      }}
      {...props}
    />
  )
}
