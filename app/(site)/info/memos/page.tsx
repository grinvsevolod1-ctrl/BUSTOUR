import fs from "node:fs"
import path from "node:path"
import type { Metadata } from "next"
import Image from "next/image"
import { Breadcrumb } from "@/components/site/breadcrumb"
import { TitleUnderline } from "@/components/site/title-underline"
import { PageExtras } from "@/components/site/page-extras"
import { getPublicSettings } from "@/lib/cms"
import { metadataFromSettings } from "@/lib/seo-metadata"
import { getShortcodesDict, parseShortcodes } from "@/lib/shortcodes"
import {
  MEMOS_PAGE_CMS_KEY,
  resolveMemoTabsFromSettings,
  resolveMemosTabsOrder,
} from "@/lib/memos-page-cms"
import { MemosContent, type MemoTab } from "./memos-content"

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicSettings()
  return metadataFromSettings(
    settings,
    MEMOS_PAGE_CMS_KEY,
    "Памятки туристу — БасТур",
    "Памятки для туристов, выезжающих в разные страны: важная информация и правила, которые помогут избежать затруднений во время путешествия.",
    { path: "/info/memos" },
  )
}

function fileSizeLabel(href: string): string {
  if (!href.startsWith("/")) return "—"
  try {
    const rel = href.replace(/^\//, "")
    const bytes = fs.statSync(path.join(process.cwd(), "public", rel)).size
    return `${(bytes / 1024).toFixed(2)} Кб`
  } catch {
    return "—"
  }
}

export default async function MemosPage() {
  const [settings, dict] = await Promise.all([getPublicSettings(), getShortcodesDict()])
  const pageKey = MEMOS_PAGE_CMS_KEY
  const order = resolveMemosTabsOrder(settings)
  const rawTabs = resolveMemoTabsFromSettings(settings, order)
  const tabs: MemoTab[] = rawTabs.map((t) => ({
    id: t.id,
    label: parseShortcodes(t.label, dict),
    heading: parseShortcodes(t.heading, dict),
    bodyHtml: parseShortcodes(t.bodyHtml, dict),
    fileTitle: parseShortcodes(t.fileTitle, dict),
    fileHref: t.fileHref,
    fileSize: t.fileHref ? fileSizeLabel(t.fileHref) : "—",
  }))

  const title = parseShortcodes(settings["memos.title"]?.trim() || "Памятки туристу", dict)
  const intro = parseShortcodes(
    settings["memos.intro"]?.trim() ||
      "В этом разделе вы можете ознакомиться и скачать памятки для туристов, выезжающих в разные страны.",
    dict,
  )
  const headerImage = settings["memos.headerImage"]?.trim() || ""

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
            {headerImage ? (
              <div className="relative aspect-[21/6] w-full overflow-hidden rounded-xl bg-cream">
                <Image src={headerImage || "/placeholder.svg"} alt="" fill sizes="(max-width: 1200px) 100vw, 1200px" className="object-cover" />
              </div>
            ) : null}
            <TitleUnderline as="h1">{title}</TitleUnderline>
            {intro ? <p className="text-base leading-relaxed text-ink whitespace-pre-line">{intro}</p> : null}
          </section>
          <MemosContent tabs={tabs} />
        </div>
      </main>
      <PageExtras pageKey={pageKey} sectionPrefix={pageKey} />
    </>
  )
}
