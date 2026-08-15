import { RichContent } from "@/components/site/rich-content"
import { TransferScheduleTable } from "@/components/site/transfer-schedule-table"
import type { TransferSchedule } from "@/lib/types"

/** Server wrapper: CMS title + optional richtext around the client table. */
export function TransferScheduleBlock({
  rows,
  title,
  bookingTitle,
  beforeHtml,
  afterTitle,
  afterHtml,
  colWidths,
}: {
  rows: TransferSchedule[]
  title: string
  bookingTitle: string
  beforeHtml?: string
  afterTitle?: string
  afterHtml?: string
  /** CMS JSON: public column widths (hug / fill / fixed). */
  colWidths?: string | null
}) {
  if (!rows.length) return null
  const afterTitleTrim = afterTitle?.trim() || ""
  const afterHtmlTrim = afterHtml?.trim() || ""
  const beforeTrim = beforeHtml?.trim() || ""

  return (
    <section className="min-w-0 space-y-4">
      <h2 className="text-xl font-semibold text-ink text-balance">{title}</h2>
      {beforeTrim ? <RichContent html={beforeTrim} /> : null}
      <TransferScheduleTable rows={rows} bookingTitle={bookingTitle} colWidths={colWidths} />
      {afterTitleTrim || afterHtmlTrim ? (
        <div className="space-y-3 border-t border-line/60 pt-4">
          {afterTitleTrim ? (
            <h3 className="text-lg font-semibold text-ink text-balance">{afterTitleTrim}</h3>
          ) : null}
          {afterHtmlTrim ? <RichContent html={afterHtmlTrim} /> : null}
        </div>
      ) : null}
    </section>
  )
}
