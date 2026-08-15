import type { Article } from "@/lib/types"

export const articleCategoryPath = {
  news: "novosti",
  reviews: "obzory",
  special: "specpredlozheniya",
} satisfies Record<Article["category"], string>

export function articleUrl(article: Pick<Article, "category" | "slug">) {
  return `/info/${articleCategoryPath[article.category]}/${article.slug}`
}