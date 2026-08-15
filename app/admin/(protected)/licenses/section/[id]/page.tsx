import { notFound } from "next/navigation"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { getCertSectionById } from "@/lib/queries"
import { CertSectionForm } from "@/components/admin/cert-section-form"
import { PageHeader } from "@/components/admin/ui"

interface Props {
  params: Promise<{ id: string }>
}

export default async function AdminCertSectionPage({ params }: Props) {
  const { id } = await params
  const isNew = id === "new"
  const section = isNew ? undefined : await getCertSectionById(Number(id))
  if (!isNew && !section) notFound()

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
        <PageHeader title={isNew ? "Новый раздел" : "Редактировать раздел"} />
      </div>
      <CertSectionForm section={section} />
    </div>
  )
}
