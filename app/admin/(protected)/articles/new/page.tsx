import { ArticleForm } from "@/components/admin/article-form"

export default function NewArticlePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink">Новая статья</h1>
      <ArticleForm />
      <p className="text-sm text-admin-fg-muted">
        Сохраните новость, затем добавьте вопросы.
      </p>
    </div>
  )
}
