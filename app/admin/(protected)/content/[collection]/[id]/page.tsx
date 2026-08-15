import { notFound } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import Link from "next/link"
import { getCollection, collectionListPath } from "@/lib/admin-config"
import { getBlockById } from "@/lib/cms"
import { PageHeader } from "@/components/admin/ui"
import { BlockForm } from "@/components/admin/block-form"

export default async function EditBlockPage({
  params,
}: {
  params: Promise<{ collection: string; id: string }>
}) {
  const { collection, id } = await params
  const meta = getCollection(collection)
  if (!meta) notFound()

  const block = await getBlockById(Number(id))
  if (!block || block.collection !== meta.key) notFound()

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href={collectionListPath(meta)}
        className="inline-flex items-center gap-1 text-sm text-admin-fg-muted transition-colors hover:text-admin-fg"
      >
        <ChevronLeft className="h-4 w-4" /> {meta.label}
      </Link>
      <PageHeader title={`Редактирование: ${meta.singular}`} />
      <BlockForm meta={meta} block={block} />
    </div>
  )
}
