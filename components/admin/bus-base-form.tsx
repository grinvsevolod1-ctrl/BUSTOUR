"use client"

import { useActionState, useContext } from "react"
import { Check } from "lucide-react"
import { saveBusAction } from "@/app/admin/actions"
import type { Bus } from "@/lib/types"
import { Button, Input, Label } from "@/components/admin/ui"
import { PageSettingsFormContext } from "@/components/admin/page-settings-form"
import { SlugField } from "@/components/admin/slug-field"
import { TourCoverBuilder } from "@/components/admin/tour-cover-builder"
import { GalleryBuilder } from "@/components/admin/gallery-builder"
import { DocumentsBuilder } from "@/components/admin/documents-builder"
import { ShortcodeInput } from "@/components/admin/shortcode-input"
import { useActionToast } from "@/components/admin/use-action-toast"

export function BusBaseForm({
  bus,
  pageHeadingKey,
  pageHeadingValue = "",
}: {
  bus?: Bus
  /** CMS key `bus:{slug}.h1` — saved with page sticky Save. */
  pageHeadingKey?: string
  pageHeadingValue?: string
}) {
  const [state, action, pending] = useActionState(saveBusAction, null)
  const pageSettingsFormContext = useContext(PageSettingsFormContext)
  const titleId = bus ? "bus-title" : "new-bus-title"
  useActionToast(state, { successMessage: bus ? "Автобус сохранён" : "Автобус создан" })

  return (
    <form id="bus-base-form" action={action} className="space-y-4">
      {bus ? <input type="hidden" name="id" value={bus.id} /> : null}

      {state && "error" in state && (
        <p
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-admin-danger"
          role="alert"
        >
          {state.error}
        </p>
      )}
      <p className="text-xs text-admin-fg-muted">* — обязательные поля</p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor={titleId} required>Название</Label>
          <Input
            id={titleId}
            name="title"
            defaultValue={bus?.title ?? ""}
            required
            placeholder="Neoplan 122"
          />
          <p className="mt-1 text-xs text-admin-fg-muted">Карточки списка и хлебные крошки.</p>
        </div>
        <SlugField
          id="bus-slug"
          nameSourceId={titleId}
          defaultValue={bus?.slug ?? ""}
          placeholder="neoplan-122"
        />
        {pageHeadingKey ? (
          <div className="sm:col-span-2">
            <Label htmlFor="bus-page-heading">Заголовок страницы</Label>
            <ShortcodeInput
              id="bus-page-heading"
              label="Заголовок страницы"
              name={pageHeadingKey}
              form={pageSettingsFormContext?.formId}
              defaultValue={pageHeadingValue}
              placeholder="Аренда автобуса Neoplan 122"
            />
            <p className="mt-1 text-xs text-admin-fg-muted">H1 на публичной странице. Если пусто — используется Название.</p>
          </div>
        ) : null}
        <div>
          <Label htmlFor="bus-year">Год выпуска</Label>
          <Input id="bus-year" name="year" defaultValue={bus?.year ?? ""} placeholder="2004" />
        </div>
        <div>
          <Label htmlFor="bus-seats">Количество мест</Label>
          <Input id="bus-seats" name="seats" defaultValue={bus?.seats ?? ""} placeholder="73" />
        </div>
        <div>
          <Label htmlFor="bus-class">Класс</Label>
          <Input
            id="bus-class"
            name="busClass"
            defaultValue={bus?.busClass ?? ""}
            placeholder="Туристический"
          />
        </div>
        <div>
          <Label htmlFor="bus-phone">Телефон для заказа</Label>
          <Input
            id="bus-phone"
            name="phone"
            defaultValue={bus?.phone ?? ""}
            placeholder="+375 29 000-00-00"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Обложка</Label>
        <TourCoverBuilder image={bus?.image ?? ""} cover={bus?.cover} />
      </div>

      <div className="space-y-2">
        <Label>Галерея</Label>
        <GalleryBuilder images={bus?.gallery ?? []} />
      </div>

      <div className="space-y-2">
        <Label>Документы</Label>
        <DocumentsBuilder documents={bus?.documents ?? []} name="documents" />
      </div>

      <div className="space-y-2">
        <Label>Рассадка (посадочная схема)</Label>
        <DocumentsBuilder
          documents={bus?.seating ?? []}
          name="seating"
          emptyHint="Схемы нет. Добавьте PDF или изображение рассадки."
          addLabel="Схема"
        />
      </div>

      {state && "success" in state && state.success && (
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-xs text-green-700">
            <Check className="h-3.5 w-3.5" />
            Сохранено
          </span>
        </div>
      )}
      {!pageSettingsFormContext ? (
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Сохранение…" : "Сохранить"}
        </Button>
      ) : null}
    </form>
  )
}
