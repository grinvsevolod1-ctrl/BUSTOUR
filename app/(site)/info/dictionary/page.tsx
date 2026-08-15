import type { Metadata } from "next"
import { Breadcrumb } from "@/components/site/breadcrumb"
import { TitleUnderline } from "@/components/site/title-underline"
import { PageExtras } from "@/components/site/page-extras"
import { getPublicSettings } from "@/lib/cms"
import { metadataFromSettings } from "@/lib/seo-metadata"
import { getShortcodesDict, parseShortcodes } from "@/lib/shortcodes"
import {
  DICTIONARY_PAGE_CMS_KEY,
  resolveDictionaryEntriesFromSettings,
  resolveDictionaryTabsOrder,
} from "@/lib/dictionary-page-cms"
import { DictionaryContent, type DictionaryEntry } from "./dictionary-content"

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicSettings()
  return metadataFromSettings(
    settings,
    DICTIONARY_PAGE_CMS_KEY,
    "Туристический словарь — БасТур",
    "Словарь туристических терминов, аббревиатур и сокращений. Говорите с турагентом на одном языке.",
    { path: "/info/dictionary" },
  )
}

export default async function DictionaryPage() {
  const [settings, dict] = await Promise.all([getPublicSettings(), getShortcodesDict()])
  const pageKey = DICTIONARY_PAGE_CMS_KEY
  const order = resolveDictionaryTabsOrder(settings)
  const raw = resolveDictionaryEntriesFromSettings(settings, order)
  const entries: DictionaryEntry[] = raw.map((e) => ({
    id: e.id,
    label: parseShortcodes(e.label, dict),
    heading: parseShortcodes(e.heading, dict),
    body: parseShortcodes(e.body, dict),
  }))

  const title = parseShortcodes(
    settings["dictionary.title"]?.trim() || "Туристический словарь",
    dict,
  )
  const intro = parseShortcodes(
    settings["dictionary.intro"]?.trim() ||
      "Отправляясь к представителю туристического агентства, дабы рассказать ему о своих желаниях и возможностях, чтобы тот подобрал вам тур, который вы хотите, — необходимо общаться с турагентами на одном языке. Насколько точно турагент воплотит в реальность все ваши пожелания по поводу грядущего отдыха, во многом зависит от того, насколько точно и понятно вы их изложите.\nГоворить с профессионалом на одном языке вам поможет наш словарь туристических терминов, в котором мы собрали понятия, общепринятые в современном международном туризме.",
    dict,
  )

  return (
    <>
      <main className="mx-auto w-full max-w-[1440px] px-4 py-8 md:px-6">
        <Breadcrumb
          items={[
            { label: "Главная", href: "/" },
            { label: "Полезная информация", href: "/info" },
            { label: title },
          ]}
        />

        <div className="space-y-8">
          <section className="space-y-6">
            <TitleUnderline as="h1">{title}</TitleUnderline>
            {intro ? <p className="text-base leading-relaxed text-ink whitespace-pre-line">{intro}</p> : null}
          </section>
          <DictionaryContent entries={entries} />
        </div>
      </main>

      <PageExtras pageKey={pageKey} faqScope={pageKey} sectionPrefix={pageKey} />
    </>
  )
}
