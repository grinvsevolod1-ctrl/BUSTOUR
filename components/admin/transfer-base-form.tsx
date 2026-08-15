"use client"

import { useActionState, useContext, useState } from "react"
import { Check } from "lucide-react"
import { saveTransferAction } from "@/app/admin/actions"
import type { Transfer } from "@/lib/types"
import { Button, Input, Label, Select } from "@/components/admin/ui"
import { PageSettingsFormContext } from "@/components/admin/page-settings-form"
import { SlugField } from "@/components/admin/slug-field"
import { MediaUploader } from "@/components/admin/media-uploader"
import { uploadedFileFromUrl, type UploadedFile } from "@/components/admin/media-uploader"
import { RichEditor } from "@/components/admin/rich-editor"
import { ShortcodeInput } from "@/components/admin/shortcode-input"
import { useActionToast } from "@/components/admin/use-action-toast"

export function TransferBaseForm({
  transfer,
  pageHeadingKey,
  pageHeadingValue = "",
}: {
  transfer?: Transfer
  /** CMS key `transfer:{slug}.h1` — saved with page sticky Save. */
  pageHeadingKey?: string
  pageHeadingValue?: string
}) {
  const [state, action, pending] = useActionState(saveTransferAction, null)
  const [file, setFile] = useState<UploadedFile | null>(transfer?.image ? uploadedFileFromUrl(transfer.image) : null)
  const pageSettingsFormContext = useContext(PageSettingsFormContext)
  const titleId = transfer ? "transfer-title" : "new-transfer-title"
  useActionToast(state, { successMessage: transfer ? "Трансфер сохранён" : "Трансфер создан" })

  return (
    <form id="transfer-base-form" action={action} className="space-y-4">
      {transfer ? <input type="hidden" name="id" value={transfer.id} /> : null}
      {state && "error" in state ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-admin-danger" role="alert">
          {state.error}
        </p>
      ) : null}
      <p className="text-xs text-admin-fg-muted">* — обязательные поля</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor={titleId} required>Название</Label>
          <Input id={titleId} name="title" defaultValue={transfer?.title ?? ""} required placeholder="Внуково" />
          <p className="mt-1 text-xs text-admin-fg-muted">Карточки списка и хлебные крошки.</p>
        </div>
        <SlugField id="transfer-slug" nameSourceId={titleId} defaultValue={transfer?.slug ?? ""} placeholder="sheremetyevo" />
        {pageHeadingKey ? (
          <div className="sm:col-span-2">
            <Label htmlFor="transfer-page-heading">Заголовок страницы</Label>
            <ShortcodeInput
              id="transfer-page-heading"
              label="Заголовок страницы"
              name={pageHeadingKey}
              form={pageSettingsFormContext?.formId}
              defaultValue={pageHeadingValue}
              placeholder="Трансфер в аэропорт Внуково"
            />
            <p className="mt-1 text-xs text-admin-fg-muted">H1 на публичной странице. Если пусто — используется Название.</p>
          </div>
        ) : null}
        <div>
          <Label htmlFor="transfer-category" required>Категория</Label>
          <Select id="transfer-category" name="category" defaultValue={transfer?.category ?? "airport"} required>
            <option value="airport">Трансфер в аэропорты</option>
            <option value="individual">Индивидуальный</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="transfer-round-trip">Цена туда и обратно</Label>
          <Input
            id="transfer-round-trip"
            name="priceRoundTrip"
            type="number"
            min="0"
            step="0.01"
            defaultValue={transfer?.priceRoundTrip || ""}
          />
        </div>
        <div>
          <Label htmlFor="transfer-one-way">Цена в одну сторону</Label>
          <Input
            id="transfer-one-way"
            name="priceOneWay"
            type="number"
            min="0"
            step="0.01"
            defaultValue={transfer?.priceOneWay || ""}
          />
        </div>
      </div>
      <div>
        <Label>Описание</Label>
        <RichEditor name="intro" defaultValue={transfer?.intro ?? ""} placeholder="Описание трансфера" minHeight="140px" />
      </div>
      <div className="space-y-2">
        <Label>Изображение</Label>
        <input type="hidden" name="image" value={file?.url ?? ""} />
        <MediaUploader value={file} onChange={setFile} accept={["image"]} />
      </div>
      {state && "success" in state && state.success ? (
        <span className="flex items-center gap-1 text-xs text-green-700">
          <Check className="h-3.5 w-3.5" />
          Сохранено
        </span>
      ) : null}
      {!pageSettingsFormContext ? (
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Сохранение…" : "Сохранить"}
        </Button>
      ) : null}
    </form>
  )
}
