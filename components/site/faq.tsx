"use client"

import { useState } from "react"
import { Plus, Minus } from "lucide-react"
import { TitleUnderline } from "./title-underline"
import { cn } from "@/lib/utils"
import type { ContentBlock } from "@/lib/types"
import { sanitizeCmsHtml } from "@/lib/sanitize-html"

type FaqItem = { id: number; question: string; answer: string; defaultOpen: boolean }

function looksLikeHtml(s: string) {
  return /<\/?[a-z][\s\S]*>/i.test(s)
}

export function Faq({
  items,
  title,
  bare = false,
}: {
  items: ContentBlock[]
  title: string
  bare?: boolean
}) {
  const faqs: FaqItem[] = items.map((b) => ({
    id: b.id,
    question: b.title,
    answer: b.body,
    defaultOpen: Boolean(b.extra?.defaultOpen),
  }))

  const [open, setOpen] = useState<number | null>(faqs.find((f) => f.defaultOpen)?.id ?? null)

  if (!faqs.length) return null

  const content = (
    <>
      <TitleUnderline>{title}</TitleUnderline>
      <div className="space-y-3">
        {faqs.map((f) => {
          const isOpen = open === f.id
          const Icon = isOpen ? Minus : Plus
          return (
            <div
              key={f.id}
              className="overflow-hidden rounded-xl border border-line bg-card"
            >
              <h3>
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : f.id)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                >
                  <span
                    className={cn(
                      "text-lg font-semibold leading-6 text-pretty",
                      isOpen ? "text-brand" : "text-ink",
                    )}
                  >
                    {f.question}
                  </span>
                  <Icon
                    className={cn("h-6 w-6 shrink-0", isOpen ? "text-brand" : "text-ink")}
                    strokeWidth={2}
                    aria-hidden
                  />
                </button>
              </h3>
              <div
                className={cn(
                  "grid transition-all duration-200 ease-out",
                  isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                )}
              >
                <div className="overflow-hidden">
                  {looksLikeHtml(f.answer) ? (
                    <div
                      className="prose-content px-6 pb-4 text-base leading-6 text-ink-muted"
                      dangerouslySetInnerHTML={{ __html: sanitizeCmsHtml(f.answer) }}
                    />
                  ) : (
                    <p className="px-6 pb-4 text-base leading-6 text-ink-muted">{f.answer}</p>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )

  if (bare) return <section className="space-y-3">{content}</section>

  return (
    <section className="mx-auto w-full max-w-[1440px] space-y-3 px-4 py-6 md:px-6">
      {content}
    </section>
  )
}
