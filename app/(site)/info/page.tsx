import type { Metadata } from "next"
import { Breadcrumb } from "@/components/site/breadcrumb"
import { TitleUnderline } from "@/components/site/title-underline"
import { PageExtras } from "@/components/site/page-extras"
import { ArticleCategorySection } from "@/components/site/article-category-section"
import { getArticles } from "@/lib/queries"
import { expandPublicList } from "@/lib/expand-content-blocks"
import { ARTICLE_CATEGORIES, type ArticleCategory } from "@/lib/types"

export const metadata: Metadata = {
  title: "Полезная информация — БасТур",
  description: "Статьи и советы для путешественников от туристической компании БасТур.",
}

export default async function InfoPage() {
  const articles = await expandPublicList(await getArticles())
  const grouped = new Map<ArticleCategory, typeof articles>()
  for (const category of ARTICLE_CATEGORIES) grouped.set(category, [])
  for (const article of articles) {
    const group = grouped.get(article.category)
    if (group) group.push(article)
  }

  return (
    <>
      <main className="mx-auto w-full max-w-[1440px] px-4 py-8 md:px-6">
        <Breadcrumb items={[{ label: "Главная", href: "/" }, { label: "Полезная информация" }]} />
        <div className="space-y-8">
          <TitleUnderline as="h1">Полезная информация</TitleUnderline>
          {ARTICLE_CATEGORIES.map((category) => {
            const categoryArticles = grouped.get(category) ?? []
            return categoryArticles.length ? (
              <ArticleCategorySection
                key={category}
                category={category}
                articles={categoryArticles}
              />
            ) : null
          })}
        </div>
      </main>
      <PageExtras pageKey="info" />
    </>
  )
}
