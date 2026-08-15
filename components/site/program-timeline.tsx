"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"

/**
 * Extracts a short numeric day label (and a noun word) from a stored `day` string.
 *  - "День 3"            → { num: "3",  word: "день"  }
 *  - "Дни 2–4" / "Дни 2-4" → { num: "2–4", word: "дни" }
 *  - anything else (legacy free-form or custom) → fall back to first 1-3 tokens / trimmed.
 */
function parseDayLabel(raw: string): { num: string; word: string; fullTitle: string } {
  const s = raw.trim()
  if (!s) return { num: "1", word: "день", fullTitle: "День 1" }
  const mRange = s.match(/^Дни?\s+(\d+)\s*[–—-]\s*(\d+)\s*$/i)
  if (mRange) {
    const [, a, b] = mRange
    return { num: `${a}–${b}`, word: Number(b) - Number(a) + 1 === 1 ? "день" : "дни", fullTitle: s }
  }
  const mSingle = s.match(/^День\s+(\d+)\s*$/i)
  if (mSingle) {
    const [, n] = mSingle
    const x = Number(n)
    const word = x % 10 === 1 && x % 100 !== 11 ? "день" : x % 10 >= 2 && x % 10 <= 4 && (x % 100 < 10 || x % 100 >= 20) ? "дня" : "дней"
    return { num: n, word, fullTitle: s }
  }
  return { num: "", word: "", fullTitle: s }
}

/** Rich or plain? Legacy tour text was plain; new program saves HTML. Render via dangerouslySetInnerHTML if tags present. */
function renderProgramText(text: string) {
  const t = text ?? ""
  const hasHtml = /<[a-zA-Z][^>]*>/.test(t)
  if (hasHtml) {
    return (
      <div
        className="prose prose-sm max-w-none prose-a:text-brand prose-strong:text-ink prose-headings:text-ink prose-ul:list-disc prose-ol:list-decimal prose-li:marker:text-brand"
        dangerouslySetInnerHTML={{ __html: t }}
      />
    )
  }
  return <div className="whitespace-pre-wrap text-base leading-relaxed text-ink">{t}</div>
}

export function ProgramTimeline({ items }: { items: { day: string; text: string }[] }) {
  const [open, setOpen] = useState<number | null>(0)
  if (!items.length) return null
  const lastIdx = items.length - 1

  return (
    <div className="rounded-3xl bg-white">
      {items.map((p, i) => {
        const isOpen = open === i
        const isLast = i === lastIdx
        const label = parseDayLabel(p.day)
        return (
          <div
            key={`${p.day}::${p.text.slice(0, 48)}`}
            className="flex cursor-pointer items-stretch gap-6 rounded-xl px-6 py-3 transition-colors hover:bg-[#fafafa]"
            onClick={() => setOpen(isOpen ? null : i)}
          >
            {/* Left: day number + дней label + dashed connector */}
            <div className="flex w-10 shrink-0 flex-col items-center">
              <span
                className={`text-2xl font-semibold leading-tight transition-colors ${
                  isOpen ? "text-brand" : "text-ink-muted"
                }`}
              >
                {label.num || (i + 1)}
              </span>
              <span
                className={`text-base font-normal leading-tight transition-colors ${
                  isOpen ? "text-brand" : "text-ink-muted"
                }`}
              >
                {label.word || "день"}
              </span>
              {/* Dashed amber line — visible only when expanded and not the last item */}
              {isOpen && !isLast && (
                <div
                  className="mt-2 w-0.5 flex-1"
                  style={{
                    marginBottom: "-12px",
                    backgroundImage:
                      "linear-gradient(to bottom, var(--color-brand, #F0B336) 50%, transparent 50%)",
                    backgroundSize: "2px 14px",
                    backgroundRepeat: "repeat-y",
                  }}
                  aria-hidden
                />
              )}
            </div>

            {/* Right: header + body */}
            <div className="flex flex-1 flex-col justify-center pb-2">
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-lg font-semibold leading-snug text-ink">{label.fullTitle}</h3>
                {isOpen ? (
                  <ChevronDown className="h-5 w-5 shrink-0 text-brand" aria-hidden />
                ) : (
                  <ChevronRight className="h-5 w-5 shrink-0 text-brand" aria-hidden />
                )}
              </div>
              {isOpen && p.text ? (
                <div className="mt-3 rounded bg-[#FFF9ED] px-4 py-4 text-base leading-relaxed text-ink">
                  {renderProgramText(p.text)}
                </div>
              ) : null}
            </div>
          </div>
        )
      })}
    </div>
  )
}
