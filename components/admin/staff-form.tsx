"use client"

import { useActionState } from "react"
import { saveStaffAction } from "@/app/admin/staff-actions"
import type { StaffMember } from "@/lib/types"
import {
  FormSection,
  FloatingSave,
  Label,
  Input,
} from "@/components/admin/ui"
import { SettingMediaField } from "@/components/admin/setting-media-field"
import { useActionToast } from "@/components/admin/use-action-toast"

export function StaffForm({ member }: { member?: StaffMember }) {
  const [state, action, pending] = useActionState(saveStaffAction, null)
  useActionToast(state, { successMessage: member ? "Сотрудник сохранён" : "Сотрудник добавлен" })

  return (
    <form action={action} className="space-y-6">
      {member && <input type="hidden" name="id" value={member.id} />}

      {state?.error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </p>
      )}
      <p className="text-xs text-admin-fg-muted">* — обязательные поля</p>

      <FormSection id="main" title="Основные данные">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="name" required>ФИО</Label>
            <Input
              id="name"
              name="name"
              defaultValue={member?.name ?? ""}
              placeholder="Иванова Мария Петровна"
              required
            />
          </div>
          <div>
            <Label htmlFor="position">Должность</Label>
            <Input
              id="position"
              name="position"
              defaultValue={member?.position ?? ""}
              placeholder="Менеджер по туризму"
            />
          </div>
          <div>
            <Label htmlFor="phone">Телефон</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              defaultValue={member?.phone ?? ""}
              placeholder="+375 29 000-00-00"
            />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={member?.email ?? ""}
              placeholder="name@bus-tour.by"
            />
          </div>
          <div className="md:col-span-2">
            <SettingMediaField name="photo" label="Фото" value={member?.photo ?? ""} />
          </div>
          <div>
            <Label htmlFor="sortOrder">Порядок сортировки</Label>
            <Input
              id="sortOrder"
              name="sortOrder"
              type="number"
              defaultValue={member?.sortOrder ?? 0}
              min={0}
            />
          </div>
        </div>
      </FormSection>

      <FloatingSave pending={pending} />
    </form>
  )
}
