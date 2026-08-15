import type { Ref } from "react"

export function TitleUnderline({
  children,
  as: Tag = "h2",
  id,
  tabIndex,
  headingRef,
}: {
  children: React.ReactNode
  as?: "h1" | "h2" | "h3"
  id?: string
  tabIndex?: number
  headingRef?: Ref<HTMLHeadingElement>
}) {
  return (
    <div className="flex w-full items-center gap-2.5 border-b-2 border-brand py-1">
      <Tag
        id={id}
        tabIndex={tabIndex}
        // Dynamic heading tag — cast ref for h1|h2|h3 union
        ref={headingRef as Ref<HTMLHeadingElement>}
        className="min-w-0 flex-1 break-words text-balance text-2xl font-semibold leading-8 text-ink outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
      >
        {children}
      </Tag>
    </div>
  )
}
