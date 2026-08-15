import type { Metadata } from "next"
import { callusSlotsFromOrder, isCallusSectionKey } from "@/lib/multipliable-sections"
import { notFound } from "next/navigation"
import { Breadcrumb } from "@/components/site/breadcrumb"
import { TitleUnderline } from "@/components/site/title-underline"
import { RichContent } from "@/components/site/rich-content"
import { PageExtras } from "@/components/site/page-extras"
import { TransferScheduleBlock } from "@/components/site/transfer-schedule-block"
import { getPublicSettings, isOn } from "@/lib/cms"
import { getTransfer, getTransferById, getTransfers, getTransferSchedules } from "@/lib/queries"
import { formatMoney } from "@/lib/currencies"
import { metadataFromSettings } from "@/lib/seo-metadata"
import { stripArchivedSuffix } from "@/lib/archive-slug"
import { previewAllows, readAuthorizedPreview } from "@/lib/preview-access"
import {
  resolveTransferScheduleTitle,
  transferPageHeading,
  transferScheduleCmsKeys,
  withTransferSeoAlias,
} from "@/lib/transfer-display"
import { ParsedText } from "@/components/site/parsed-text"

export const dynamic = "force-dynamic"

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const [transfer, settings] = await Promise.all([getTransfer(slug), getPublicSettings()])
  if (!transfer) return { title: "Трансфер в аэропорт — БасТур" }
  const pageKey = `transfer:${transfer.slug}`
  const heading = transferPageHeading(settings, pageKey, transfer.title)
  return metadataFromSettings(
    settings,
    pageKey,
    `${heading} — БасТур`,
    transfer.intro.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() || `${heading}.`,
    { path: `/info/transfers/${transfer.slug}` },
  )
}

export default async function TransferDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const { slug } = await params
  const preview = await readAuthorizedPreview(searchParams)
  const transfer =
    preview?.type === "transfer" ? await getTransferById(preview.id) : await getTransfer(slug)
  if (!transfer) notFound()
  const [rawSettings, schedules] = await Promise.all([getPublicSettings(), getTransferSchedules(transfer.id)])
  const liveSlug = stripArchivedSuffix(transfer.slug)
  const pageKey = `transfer:${liveSlug}`
  const settings = withTransferSeoAlias(rawSettings, pageKey)
  if (transfer.archived) {
    if (!(await previewAllows(searchParams, "transfer", transfer.id))) notFound()
  } else if (!isOn(settings, `${pageKey}.visible`)) {
    notFound()
  }

  const sectionOrder = (() => {
    try {
      const raw = settings[`${pageKey}.sections.order`]
      if (raw) return JSON.parse(raw) as string[]
    } catch {}
    return ["seo", "schedules", "faq", "callus"]
  })()
  const pageHeading = transferPageHeading(settings, pageKey, transfer.title)
  const outbound = schedules.filter((row) => row.direction === "outbound")
  const returning = schedules.filter((row) => row.direction === "return")

  return (
    <>
      <main className="mx-auto w-full max-w-[1440px] px-4 py-8 md:px-6">
        <Breadcrumb items={[
          { label: "Главная", href: "/" },
          { label: "Полезная информация", href: "/info" },
          { label: "Трансферы в аэропорт", href: "/info/transfers" },
          { label: transfer.title },
        ]} />
        <div className="space-y-8">
          <TitleUnderline as="h1">
            <ParsedText text={pageHeading} />
          </TitleUnderline>
          {transfer.intro ? <RichContent html={transfer.intro} /> : null}

          {(transfer.priceRoundTrip > 0 || transfer.priceOneWay > 0) ? (
            <section className="flex flex-wrap gap-x-10 gap-y-3 border-y-2 border-brand py-4 text-base text-ink">
              {transfer.priceRoundTrip > 0 ? <p>Проезд в обе стороны — <strong className="text-price">{formatMoney(transfer.priceRoundTrip, "BYN")}</strong></p> : null}
              {transfer.priceOneWay > 0 ? <p>В одну сторону — <strong className="text-price">{formatMoney(transfer.priceOneWay, "BYN")}</strong></p> : null}
            </section>
          ) : null}

          {sectionOrder.map((key) => {
            if (key === "schedules") {
              return (
                <div key={key} className="space-y-8">
                  {isOn(settings, `${pageKey}.section.${key}`) ? (
                    <>
                      {(["outbound", "return"] as const).map((direction) => {
                        const keys = transferScheduleCmsKeys(pageKey, direction)
                        const rows = direction === "outbound" ? outbound : returning
                        return (
                          <TransferScheduleBlock
                            key={direction}
                            rows={rows}
                            title={resolveTransferScheduleTitle(settings, pageKey, direction)}
                            bookingTitle={transfer.title}
                            beforeHtml={settings[keys.beforeHtml]}
                            afterTitle={settings[keys.afterTitle]}
                            afterHtml={settings[keys.afterHtml]}
                            colWidths={settings[keys.colWidths]}
                          />
                        )
                      })}
                    </>
                  ) : null}
                </div>
              )
            }
            if (key === "seo" || /^seo\d+$/.test(key)) {
              const suffix = key === "seo" ? "" : key.replace("seo", "")
              const title = settings[`${pageKey}.seoTitle${suffix}`] ?? ""
              const html = settings[`${pageKey}.seoHtml${suffix}`] ?? ""
              if (!html || !isOn(settings, `${pageKey}.section.${key}`)) return null
              return (
                <section key={key} className="space-y-4">
                  {title ? <TitleUnderline as="h2">{title}</TitleUnderline> : null}
                  <RichContent html={html} />
                </section>
              )
            }
            return null
          })}
        </div>
      </main>
      <PageExtras
        pageKey="transfer"
        faqScope={pageKey}
        sectionPrefix={pageKey}
        callusSlots={callusSlotsFromOrder(sectionOrder)}
        showCallUs={callusSlotsFromOrder(sectionOrder).length > 0}
        showFaq={sectionOrder.includes("faq")}
      />
    </>
  )
}
