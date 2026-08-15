"use client"

import { useState } from "react"
import { ModalTestimonial } from "@/components/site/modals"

export function TestimonialButton({
  label = "Оставить отзыв",
}: {
  label?: string
  /** @deprecated unused — tour/country binding is admin-only (#63) */
  countries?: string[]
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-block w-fit rounded bg-brand px-6 py-3 text-base font-semibold text-brand-foreground transition-opacity hover:opacity-90"
      >
        {label}
      </button>
      <ModalTestimonial open={open} onClose={() => setOpen(false)} />
    </>
  )
}
