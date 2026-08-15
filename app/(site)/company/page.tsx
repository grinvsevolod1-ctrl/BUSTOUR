import type { Metadata } from "next"
import { isCallusSectionKey } from "@/lib/multipliable-sections"
import { Breadcrumb } from "@/components/site/breadcrumb"
import { TitleUnderline } from "@/components/site/title-underline"
import { RichContent } from "@/components/site/rich-content"
import { OrderedCallUs } from "@/components/site/ordered-callus"
import { OrderedFaqSection } from "@/components/site/ordered-faq-section"
import { getFaqs, getPublicSettings } from "@/lib/cms"
import { metadataFromSettings } from "@/lib/seo-metadata"
import { ParsedText } from "@/components/site/parsed-text"

export async function generateMetadata(): Promise<Metadata> {
  const s = await getPublicSettings()
  return metadataFromSettings(
    s,
    "company",
    "Компания — БасТур",
    "О туристической компании БасТур: наша история, ценности и достижения.",
    { path: "/company" },
  )
}

export default async function CompanyPage() {
  const [s, faqs] = await Promise.all([getPublicSettings(), getFaqs("company")])
  const sectionOrder = (() => {
    try {
      const raw = s["company.sections.order"]
      if (raw) return JSON.parse(raw) as string[]
    } catch {}
    return ["faq", "callus"]
  })()

  return (
    <main className="mx-auto w-full max-w-[1440px] space-y-6 px-4 py-8 md:px-6">
      <Breadcrumb items={[{ label: "Главная", href: "/" }, { label: "Компания" }]} />
      <TitleUnderline as="h1"><ParsedText text={s["company.title"] || "О компании"} /></TitleUnderline>
      {s["company.body"] ? <RichContent html={s["company.body"]} /> : null}

      {sectionOrder.map((key) => {
        if (key === "faq" || /^faq\d+$/.test(key)) {
          return (
            <OrderedFaqSection
              key={key}
              sectionKey={key}
              pageKey="company"
              settings={s}
              allFaqs={faqs}
              defaultTitle={s["title.faq"] || "Частые вопросы"}
            />
          )
        }
        if (isCallusSectionKey(key)) {
          return (
            <OrderedCallUs
              key={key}
              sectionKey={key}
              settingsPrefix="company"
              settings={s}
            />
          )
        }
        return null
      })}
    </main>
  )
}
