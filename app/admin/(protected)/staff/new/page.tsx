import { StaffForm } from "@/components/admin/staff-form"
import { PageHeader, ButtonLink } from "@/components/admin/ui"

export default function NewStaffPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Новый сотрудник">
        <ButtonLink href="/admin/staff" variant="secondary" size="sm">
          ← Назад
        </ButtonLink>
      </PageHeader>

      <StaffForm />
    </div>
  )
}
