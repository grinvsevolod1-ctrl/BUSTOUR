import { notFound } from "next/navigation"
import { Breadcrumb } from "@/components/site/breadcrumb"
import { PageExtras } from "@/components/site/page-extras"
import { RichContent } from "@/components/site/rich-content"
import { TitleUnderline } from "@/components/site/title-underline"
import { formatArticleDate } from "@/lib/article-date"
import { articleUrl } from "@/lib/article-url"
import { getPublicSettings, getSiteOrigin, isOn } from "@/lib/cms"
import { callusSlotsFromOrder } from "@/lib/multipliable-sections"
import { getArticle, getArticleById } from "@/lib/queries"
import { previewAllows, readAuthorizedPreview } from "@/lib/preview-access"
import { ParsedText } from "@/components/site/parsed-text"
import { buildArticleJsonLd, serializeJsonLd } from "@/lib/site-schema"

export async function ArticlePageContent({
  slug,
  searchParams,
}: {
  slug: string
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const preview = await readAuthorizedPreview(searchParams)
  const article =
    preview?.type === "article" ? await getArticleById(preview.id) : await getArticle(slug)
  if (!article) notFound()
  if (article.archived) {
    if (!(await previewAllows(searchParams, "article", article.id))) notFound()
  }
  const settings = await getPublicSettings()
  const origin = getSiteOrigin(settings)
  const pageKey = `article:${article.id}`
  const sectionOrder = (() => {
    try {
      const raw = settings[`${pageKey}.sections.order`]
      if (raw) return JSON.parse(raw) as string[]
    } catch {}
    return ["seo", "faq", "callus"]
  })()
  const visibleSeoKeys = sectionOrder.filter((key) => {
    if (!/^seo\d*$/.test(key) || !isOn(settings, `${pageKey}.section.${key}`)) return false
    const suffix = key === "seo" ? "" : key.replace("seo", "")
    return Boolean(settings[`${pageKey}.seoHtml${suffix}`])
  })

  const articleSchema = buildArticleJsonLd({
    origin,
    brandName: settings["site.brand"] || "БасТур",
    title: article.title,
    description: article.metaShortDesc || article.metaDescription || article.excerpt,
    image: article.metaImage || article.image,
    date: article.date,
    urlPath: articleUrl(article),
  })

  return (
    <>
      <main className="mx-auto w-full max-w-[1440px] px-4 py-8 md:px-6">
        {articleSchema ? (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: serializeJsonLd(articleSchema) }}
          />
        ) : null}
        <Breadcrumb items={[{ label: "Полезная информация", href: "/info" }, { label: article.title }]} />
        <article className="mt-4">
          <span className="text-sm text-ink-muted">{formatArticleDate(article.date)}</span>
          <h1 className="mt-2 text-3xl font-bold leading-tight text-ink text-balance">
            <ParsedText text={article.title} />
          </h1>
          <div className="mt-6 space-y-4 text-base leading-relaxed text-ink">
            {visibleSeoKeys.length ? (
              visibleSeoKeys.map((key) => {
                const suffix = key === "seo" ? "" : key.replace("seo", "")
                const html = settings[`${pageKey}.seoHtml${suffix}`] ?? ""
                const title = settings[`${pageKey}.seoTitle${suffix}`] ?? ""
                return (
                  <section key={key} className="space-y-4">
                    {title ? <TitleUnderline as="h2">{title}</TitleUnderline> : null}
                    <RichContent html={html} />
                  </section>
                )
              })
            ) : article.contentHtml ? (
              <RichContent html={article.contentHtml} />
            ) : (
              <p className="text-ink-muted">Материал скоро появится.</p>
            )}
          </div>
        </article>
      </main>
      <PageExtras
        pageKey={pageKey}
        faqScope={pageKey}
        sectionPrefix={pageKey}
        callusSlots={callusSlotsFromOrder(sectionOrder)}
        showFaq={sectionOrder.some((k) => k === "faq" || /^faq\d+$/.test(k))}
      />
    </>
  )
}
