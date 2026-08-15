"use client"

import { useActionState } from "react"
import { saveCertificateAction } from "@/app/admin/cert-actions"
import type { Certificate, CertSection } from "@/lib/types"
import { FormSection, FloatingSave, Label, Input, Textarea, Select } from "@/components/admin/ui"
import { SettingMediaField } from "@/components/admin/setting-media-field"
import { useActionToast } from "@/components/admin/use-action-toast"

export function CertForm({
  cert,
  sections,
  defaultSectionId,
}: {
  cert?: Certificate
  sections: CertSection[]
  defaultSectionId?: number
}) {
  const [state, action, pending] = useActionState(saveCertificateAction, null)
  useActionToast(state, { successMessage: cert ? "Документ сохранён" : "Документ добавлен" })

  return (
    <form action={action} className="space-y-6">
      {cert && <input type="hidden" name="id" value={cert.id} />}

      {state?.error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <FormSection id="main" title="Документ">
        <p className="text-xs text-admin-fg-muted">* — обязательные поля</p>
        <div className="grid gap-4 md:grid-cols-2">
          {/* Section */}
          <div className="md:col-span-2">
            <Label htmlFor="sectionId" required>Раздел</Label>
            <Select
              id="sectionId"
              name="sectionId"
              defaultValue={String(cert?.sectionId ?? defaultSectionId ?? sections[0]?.id ?? "")}
              required
            >
              <option value="">— выберите раздел —</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </Select>
          </div>

          {/* Name */}
          <div className="md:col-span-2">
            <Label htmlFor="name" required>Название документа</Label>
            <Input
              id="name"
              name="name"
              defaultValue={cert?.name ?? ""}
              placeholder="Лицензия на туроператорскую деятельность"
              required
            />
          </div>

          {/* Description */}
          <div className="md:col-span-2">
            <Label htmlFor="description">Описание</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={cert?.description ?? ""}
              placeholder="Серия, номер, выдавший орган, срок действия…"
              rows={3}
            />
          </div>

          {/* Image */}
          <div className="md:col-span-2">
            <SettingMediaField name="image" label="Изображение" value={cert?.image ?? ""} />
            <p className="mt-1 text-xs text-admin-fg-muted">
              Оставьте пустым, если скан не нужен — отобразится иконка документа.
            </p>
          </div>

          {/* Sort order */}
          <div>
            <Label htmlFor="sortOrder">Порядок сортировки</Label>
            <Input
              id="sortOrder"
              name="sortOrder"
              type="number"
              defaultValue={cert?.sortOrder ?? 0}
              min={0}
            />
          </div>
        </div>
      </FormSection>

      <FloatingSave pending={pending} />
    </form>
  )
}
