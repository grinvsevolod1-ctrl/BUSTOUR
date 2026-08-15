import { Plus, Pencil, Archive, ExternalLink } from "lucide-react"
import { getArticles } from "@/lib/queries"
import { deleteArticleAction } from "@/app/admin/actions"
import { ConfirmActionForm } from "@/components/admin/confirm-action-form"
import {
  PageHeader,
  ButtonLink,
  TableWrap,
  Thead,
  Th,
  Tbody,
  Td,
  Tr,
  IconButton,
  IconLink,
  EmptyState,
} from "@/components/admin/ui"
import { articleUrl } from "@/lib/article-url"

export default async function AdminArticlesPage() {
  const articles = await getArticles()

  return (
    <div className="space-y-6">
      <PageHeader title="Статьи" description={`Всего: ${articles.length}`}>
        <ButtonLink href="/admin/articles/new">
          <Plus className="h-4 w-4" /> Новая статья
        </ButtonLink>
      </PageHeader>

      {articles.length === 0 ? (
        <EmptyState title="Статей пока нет" description="Добавьте первую статью в раздел «Полезная информация»." />
      ) : (
        <TableWrap>
          <Thead>
            <tr>
              <Th>Заголовок</Th>
              <Th>Дата</Th>
              <Th actions className="sr-only">Действия</Th>
            </tr>
          </Thead>
          <Tbody>
            {articles.map((article) => (
              <Tr key={article.id}>
                <Td className="font-medium">{article.title}</Td>
                <Td className="whitespace-nowrap text-admin-fg-muted">{article.date}</Td>
                <Td actions>
                  <div className="flex items-center justify-end gap-1">
                    <IconLink href={articleUrl(article)} target="_blank" aria-label="Открыть на сайте">
                      <ExternalLink className="h-4 w-4" />
                    </IconLink>
                    <IconLink href={`/admin/articles/${article.id}`} aria-label="Редактировать">
                      <Pencil className="h-4 w-4" />
                    </IconLink>
                    <ConfirmActionForm
                      action={deleteArticleAction}
                      title="В архив"
                      confirmLabel="В архив"
                      message={`Перенести статью «${article.title}» в архив? Позже можно восстановить.`}
                    >
                      <input type="hidden" name="id" value={article.id} />
                      <IconButton type="submit" tone="danger" aria-label="В архив">
                        <Archive className="h-4 w-4" />
                      </IconButton>
                    </ConfirmActionForm>
                  </div>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </TableWrap>
      )}
    </div>
  )
}
