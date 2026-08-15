"use client"

import { useActionState } from "react"
import { saveCertSectionAction } from "@/app/admin/cert-actions"
import type { CertSection } from "@/lib/types"
import { FormSection, FloatingSave, Label, Input } from "@/components/admin/ui"
import { useActionToast } from "@/components/admin/use-action-toast"

export function CertSectionForm({ section }: { section?: CertSection }) {
  const [state, action, pending] = useActionState(saveCertSectionAction, null)
  useActionToast(state, { successMessage: section ? "Раздел сохранён" : "Раздел создан" })

  return (
    <form action={action} className="space-y-6">
      {section && <input type="hidden" name="id" value={section.id} />}

      {state?.error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <FormSection id="main" title="Раздел">
        <p className="text-xs text-admin-fg-muted">* — обязательные поля</p>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <Label htmlFor="title" required>Название раздела</Label>
            <Input
              id="title"
              name="title"
              defaultValue={section?.title ?? ""}
              placeholder="Лицензии и разрешения"
              required
            />
          </div>
          <div>
            <Label htmlFor="sortOrder">Порядок сортировки</Label>
            <Input
              id="sortOrder"
              name="sortOrder"
              type="number"
              defaultValue={section?.sortOrder ?? 0}
              min={0}
            />
          </div>
        </div>
      </FormSection>

      <FloatingSave pending={pending} />
    </form>
  )
}
