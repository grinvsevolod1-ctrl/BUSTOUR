import { ArticlePageContent } from "../../article-page"

export { generateMetadata } from "../../[slug]/page"
export const dynamic = "force-dynamic"

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  return <ArticlePageContent slug={(await params).slug} searchParams={searchParams} />
}
