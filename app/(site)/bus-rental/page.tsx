import type { Metadata } from "next"
import { isCallusSectionKey } from "@/lib/multipliable-sections"
import Image from "next/image"
import Link from "next/link"
import { Breadcrumb } from "@/components/site/breadcrumb"
import { TitleUnderline } from "@/components/site/title-underline"
import { RichContent } from "@/components/site/rich-content"
import { ContactForm } from "@/components/site/contact-form"
import { OrderedCallUs } from "@/components/site/ordered-callus"
import { OrderedFaqSection } from "@/components/site/ordered-faq-section"
import { PageAlert } from "@/components/site/alert"
import { getFaqs, getPublicSettings, isOn } from "@/lib/cms"
import { getBuses } from "@/lib/queries"
import { expandPublicList } from "@/lib/expand-content-blocks"
import { metadataFromSettings } from "@/lib/seo-metadata"
import { ParsedText } from "@/components/site/parsed-text"

/** Fleet list comes from DB — must not serve a stale static shell after CMS edits. */
export const dynamic = "force-dynamic"

export async function generateMetadata(): Promise<Metadata> {
  const s = await getPublicSettings()
  return metadataFromSettings(s, "rental", "Аренда автобусов — БасТур", "Аренда комфортабельных автобусов и микроавтобусов с водителем для любых поездок.", { path: "/bus-rental" })
}

export default async function BusRentalPage() {
  const [s, busesRaw, faqs] = await Promise.all([getPublicSettings(), getBuses(), getFaqs("rental")])
  const buses = await expandPublicList(busesRaw)
  const visibleBuses = buses.filter((bus) => s[`bus:${bus.slug}.visible`] !== "0")
  const sectionOrder = (() => {
    try {
      const raw = s["rental.sections.order"]
      if (raw) return JSON.parse(raw) as string[]
    } catch {}
    return ["seo", "faq", "callus"]
  })()

  return (
    <main className="mx-auto w-full max-w-[1440px] px-4 py-8 md:px-6">
      <Breadcrumb items={[{ label: "Главная", href: "/" }, { label: "Аренда автобусов" }]} />
      <div className="space-y-4">
        <TitleUnderline as="h1">
          <ParsedText text={s["rental.title"] || "Аренда автобусов"} />
        </TitleUnderline>
        <PageAlert settings={s} prefix="rental" />
        {s["rental.intro"] ? <RichContent html={s["rental.intro"]} /> : null}
      </div>

      {visibleBuses.length > 0 && (
        <>
          <div className="mt-12">
            <TitleUnderline as="h2">
              {s["rental.fleetTitle"] || "Наш автобусный парк"}
            </TitleUnderline>
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-6">
            {visibleBuses.map((bus) => {
              const specs = [
                bus.year ? `${bus.year} г.в.` : "",
                bus.seats ? `${bus.seats} мест` : "",
                bus.busClass,
              ].filter(Boolean)
              return (
                <Link
                  href={`/bus-rental/${bus.slug}`}
                  key={bus.id}
                  className="relative h-[280px] w-full min-w-[280px] max-w-[400px] flex-1 overflow-hidden rounded"
                >
                  <Image
                    src={bus.image || "/images/bus.png"}
                    alt={bus.title}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px"
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-black/20" aria-hidden />
                  <div className="absolute left-6 top-6 text-2xl font-semibold leading-8 text-white">
                    <div>{bus.title}</div>
                    {specs.length ? <div>{specs.join(", ")}</div> : null}
                  </div>
                  <span className="absolute bottom-6 left-6 rounded bg-brand px-4 py-3 text-base text-[#222]">
                    Подробнее
                  </span>
                </Link>
              )
            })}
          </div>
        </>
      )}

      {sectionOrder.map((key) => {
        if (key === "leadform") {
          if (!isOn(s, "rental.section.leadform")) return null
          return (
            <div key={key} className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-2">
              <div>
                <h2 className="text-2xl font-semibold text-ink">Оставьте заявку</h2>
                <p className="mt-2 text-base leading-relaxed text-ink-muted text-pretty">
                  Заполните форму, и наш менеджер свяжется с вами, чтобы рассчитать стоимость аренды.
                </p>
              </div>
              <ContactForm />
            </div>
          )
        }
        if (key === "faq" || /^faq\d+$/.test(key)) {
          return (
            <div key={key} className="mt-12">
              <OrderedFaqSection
                sectionKey={key}
                pageKey="rental"
                settings={s}
                allFaqs={faqs}
                defaultTitle={s["title.faq"] || "Частые вопросы"}
              />
            </div>
          )
        }
        if (isCallusSectionKey(key)) {
          return (
            <OrderedCallUs
              key={key}
              sectionKey={key}
              settingsPrefix="rental"
              settings={s}
              className="mt-12"
            />
          )
        }
        if (key !== "seo" && !/^seo\d+$/.test(key)) return null
        const suffix = key === "seo" ? "" : key.replace("seo", "")
        const html = s[`rental.seoHtml${suffix}`] ?? ""
        const title = s[`rental.seoTitle${suffix}`] ?? ""
        if ((!html && !title) || !isOn(s, `rental.section.${key}`)) return null
        return (
          <section key={key} className="mt-12 space-y-4">
            {title ? (
              <TitleUnderline as="h2">
                <ParsedText text={title} />
              </TitleUnderline>
            ) : null}
            {html ? <RichContent html={html} /> : null}
          </section>
        )
      })}
    </main>
  )
}
