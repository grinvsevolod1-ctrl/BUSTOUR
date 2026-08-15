"use client"

import * as SliderPrimitive from "@radix-ui/react-slider"
import type { ComponentPropsWithoutRef } from "react"
import { cn } from "@/lib/utils"

export function Slider({ className, ...props }: ComponentPropsWithoutRef<typeof SliderPrimitive.Root>) {
  return (
    <SliderPrimitive.Root className={cn("relative flex h-5 w-full touch-none select-none items-center", className)} {...props}>
      <SliderPrimitive.Track className="relative h-1.5 grow overflow-hidden rounded-full bg-line">
        <SliderPrimitive.Range className="absolute h-full bg-brand" />
      </SliderPrimitive.Track>
      {props.value?.map((_, index) => (
        <SliderPrimitive.Thumb
          key={index}
          className="block h-5 w-5 rounded-full border-2 border-brand bg-white shadow transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:pointer-events-none disabled:opacity-50"
          aria-label={index === 0 ? "Минимальная цена" : "Максимальная цена"}
        />
      ))}
    </SliderPrimitive.Root>
  )
}
