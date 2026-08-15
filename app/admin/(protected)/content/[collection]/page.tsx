import { notFound, redirect } from "next/navigation"
import { Plus, ChevronLeft } from "lucide-react"
import Link from "next/link"
import { getCollection } from "@/lib/admin-config"
import { getBlocks } from "@/lib/cms"
import { DragHandle } from "@/components/admin/drag-reorder-control"
import { SortableList } from "@/components/admin/reorder/sortable-collections"
import { Card, PageHeader, ButtonLink, EmptyState } from "@/components/admin/ui"
import { BlockRow } from "@/components/admin/block-row"
import { reorderBlocksAction } from "@/app/admin/cms-actions"

export const dynamic = "force-dynamic"

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ collection: string }>
}) {
  const { collection } = await params
  const meta = getCollection(collection)
  if (!meta) notFound()
  if (meta.listPath) redirect(meta.listPath)

  const blocks = await getBlocks(meta.key)
  return (
    <div className="space-y-6">
      <Link
        href="/admin/content"
        className="inline-flex items-center gap-1 text-sm text-admin-fg-muted transition-colors hover:text-admin-fg"
      >
        <ChevronLeft className="h-4 w-4" /> Весь контент
      </Link>

      <PageHeader title={meta.label} description={meta.description}>
        <ButtonLink href={`/admin/content/${meta.key}/new`} size="sm">
          <Plus className="h-4 w-4" /> Добавить
        </ButtonLink>
      </PageHeader>

      {blocks.length === 0 ? (
        <EmptyState
          title="Пока пусто"
          description={`Добавьте первый элемент «${meta.singular}», чтобы он появился на сайте.`}
        />
      ) : (
        <Card className="overflow-hidden">
          <SortableList
            action={reorderBlocksAction}
            collection={meta.key}
            className="divide-y divide-admin-border"
            items={blocks.map((block) => ({
              id: block.id,
              label: block.title || block.subtitle || block.body || `block-${block.id}`,
            }))}
          >
            {blocks.map((block, i) => (
              <BlockRow
                key={block.id}
                block={block}
                meta={meta}
                isFirst={i === 0}
                isLast={i === blocks.length - 1}
                dragHandle={<DragHandle label={block.title || block.subtitle || block.body || `block-${block.id}`} />}
              />
            ))}
          </SortableList>
        </Card>
      )}
    </div>
  )
}
