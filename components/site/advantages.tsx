import { SectionTitle } from "./section-title"
import { BlockIcon } from "./block-icon"
import type { ContentBlock } from "@/lib/types"

export function Advantages({ items, title }: { items: ContentBlock[]; title: string }) {
  if (!items.length) return null

  return (
    <section className="mx-auto w-full max-w-[1440px] space-y-6 px-4 py-6 md:px-6">
      <SectionTitle>{title}</SectionTitle>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex flex-col items-center gap-3 rounded-lg bg-cream p-6 text-center"
          >
            <span className="grid h-14 w-14 place-items-center rounded-full bg-brand">
              <BlockIcon name={item.icon} className="h-7 w-7 text-brand-foreground" />
            </span>
            <h3 className="text-lg font-semibold text-ink">{item.title}</h3>
            <p className="text-sm leading-relaxed text-ink-muted">{item.body}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
