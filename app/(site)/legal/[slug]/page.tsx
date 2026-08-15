import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Breadcrumb } from "@/components/site/breadcrumb"
import { TitleUnderline } from "@/components/site/title-underline"
import { RichContent } from "@/components/site/rich-content"
import { getPublicSettings } from "@/lib/cms"
import { metadataFromSettings } from "@/lib/seo-metadata"
import { isLegalSlug, legalPages, legalSettingKeys, LEGAL_SLUGS } from "@/lib/legal-pages"
import { ParsedText } from "@/components/site/parsed-text"

interface Props {
  params: Promise<{ slug: string }>
}

export function generateStaticParams() {
  return LEGAL_SLUGS.map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  if (!isLegalSlug(slug)) return { title: "Документ — БасТур" }
  const page = legalPages[slug]
  const s = await getPublicSettings()
  return metadataFromSettings(s, page.settingsPrefix, `${page.title} — БасТур`, page.title, {
    path: page.path,
  })
}

export default async function LegalDocumentPage({ params }: Props) {
  const { slug } = await params
  if (!isLegalSlug(slug)) notFound()

  const page = legalPages[slug]
  const keys = legalSettingKeys(page.settingsPrefix)
  const s = await getPublicSettings()
  const title = s[keys.title]?.trim() || page.title
  const body = s[keys.body]?.trim() || ""

  return (
    <main className="mx-auto w-full max-w-[1440px] space-y-6 px-4 py-8 md:px-6">
      <Breadcrumb items={[{ label: "Главная", href: "/" }, { label: title }]} />
      <div className="mx-auto max-w-[920px] space-y-6">
        <TitleUnderline as="h1">
          <ParsedText text={title} />
        </TitleUnderline>
        {body ? <RichContent html={body} /> : null}
      </div>
    </main>
  )
}
