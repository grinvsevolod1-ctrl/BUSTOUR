import { notFound } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import Link from "next/link"
import { getCollection, collectionListPath } from "@/lib/admin-config"
import { PageHeader } from "@/components/admin/ui"
import { BlockForm } from "@/components/admin/block-form"

export default async function NewBlockPage({
  params,
}: {
  params: Promise<{ collection: string }>
}) {
  const { collection } = await params
  const meta = getCollection(collection)
  if (!meta) notFound()

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href={collectionListPath(meta)}
        className="inline-flex items-center gap-1 text-sm text-admin-fg-muted transition-colors hover:text-admin-fg"
      >
        <ChevronLeft className="h-4 w-4" /> {meta.label}
      </Link>
      <PageHeader title={`Новый элемент: ${meta.singular}`} />
      <BlockForm meta={meta} />
    </div>
  )
}
