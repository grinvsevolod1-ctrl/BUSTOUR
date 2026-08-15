"use client"

import Image from "next/image"
import Link from "next/link"
import { useState } from "react"
import { TitleUnderline } from "@/components/site/title-underline"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { formatArticleDate } from "@/lib/article-date"
import { articleCategoryPath, articleUrl } from "@/lib/article-url"
import { ARTICLE_CATEGORY_LABELS, type Article, type ArticleCategory } from "@/lib/types"

const PAGE_SIZE = 4

function getPageItems(page: number, pageCount: number): Array<number | "ellipsis"> {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, index) => index + 1)
  const items: Array<number | "ellipsis"> = [1]
  if (page > 3) items.push("ellipsis")
  for (let number = Math.max(2, page - 1); number <= Math.min(pageCount - 1, page + 1); number++) {
    items.push(number)
  }
  if (page < pageCount - 2) items.push("ellipsis")
  items.push(pageCount)
  return items
}

export function ArticleCategorySection({
  category,
  articles,
}: {
  category: ArticleCategory
  articles: Article[]
}) {
  const [page, setPage] = useState(1)
  const pageCount = Math.ceil(articles.length / PAGE_SIZE)
  const visibleArticles = articles.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <section id={articleCategoryPath[category]} className="space-y-6 scroll-mt-24">
      <TitleUnderline as="h2">{ARTICLE_CATEGORY_LABELS[category]}</TitleUnderline>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {visibleArticles.map((article) => (
          <Link
            key={article.id}
            href={articleUrl(article)}
            className="group flex h-full flex-col"
          >
            <div className="relative h-[189px] w-full overflow-hidden rounded bg-line mb-5">
              <Image
                src={article.metaImage || article.image || "/placeholder.svg"}
                alt={article.title}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </div>
            <div className="flex flex-grow flex-col items-start">
              <h3 className="mb-1 text-lg font-semibold leading-tight text-ink">{article.title}</h3>
              <p className="mb-3 text-sm text-ink-muted">{formatArticleDate(article.date)}</p>
              <p className="mb-4 line-clamp-3 flex-grow text-base leading-snug text-ink">
                {article.metaShortDesc || article.excerpt}
              </p>
              <span className="mt-auto text-sm text-cyan-accent underline underline-offset-2">Подробнее</span>
            </div>
          </Link>
        ))}
      </div>
      {pageCount > 1 ? (
        <nav className="flex items-center justify-center gap-2" aria-label={`Страницы раздела ${category}`}>
          <button
            type="button"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={page === 1}
            className="grid h-10 w-10 place-items-center rounded border border-line text-ink disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Предыдущая страница"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>
          {getPageItems(page, pageCount).map((item, index) =>
            item === "ellipsis" ? (
              <span key={`ellipsis-${index}`} className="grid h-10 w-10 place-items-center text-ink-muted" aria-hidden>
                …
              </span>
            ) : (
              <button
                key={item}
                type="button"
                onClick={() => setPage(item)}
                aria-current={item === page ? "page" : undefined}
                className={`grid h-10 w-10 place-items-center rounded border text-sm ${
                  item === page
                    ? "border-brand bg-brand font-bold text-ink"
                    : "border-line bg-white text-ink hover:border-cyan-accent hover:text-cyan-accent"
                }`}
              >
                {item}
              </button>
            ),
          )}
          <button
            type="button"
            onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
            disabled={page === pageCount}
            className="grid h-10 w-10 place-items-center rounded border border-line text-ink disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Следующая страница"
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </nav>
      ) : null}
    </section>
  )
}
