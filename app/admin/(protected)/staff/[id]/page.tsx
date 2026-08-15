import { notFound } from "next/navigation"
import { getStaffMember } from "@/lib/queries"
import { StaffForm } from "@/components/admin/staff-form"
import { PageHeader, ButtonLink } from "@/components/admin/ui"

export default async function EditStaffPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const member = await getStaffMember(Number(id))
  if (!member) notFound()

  return (
    <div className="space-y-6">
      <PageHeader title={`Редактировать: ${member.name}`}>
        <ButtonLink href="/admin/staff" variant="secondary" size="sm">
          ← Назад
        </ButtonLink>
      </PageHeader>

      <StaffForm member={member} />
    </div>
  )
}
