import { notFound } from "next/navigation"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { getCertificateById, getCertSections } from "@/lib/queries"
import { CertForm } from "@/components/admin/cert-form"
import { PageHeader } from "@/components/admin/ui"

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ sectionId?: string }>
}

export default async function AdminCertPage({ params, searchParams }: Props) {
  const { id } = await params
  const { sectionId } = await searchParams
  const isNew = id === "new"
  const [cert, sections] = await Promise.all([
    isNew ? Promise.resolve(undefined) : getCertificateById(Number(id)),
    getCertSections(),
  ])
  if (!isNew && !cert) notFound()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/licenses"
          className="grid h-8 w-8 place-items-center rounded-md border border-admin-border text-admin-fg-muted transition-colors hover:bg-admin-muted hover:text-admin-fg"
          aria-label="Назад"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <PageHeader title={isNew ? "Новый документ" : "Редактировать документ"} />
      </div>
      <CertForm
        cert={cert}
        sections={sections}
        defaultSectionId={sectionId ? Number(sectionId) : undefined}
      />
    </div>
  )
}
