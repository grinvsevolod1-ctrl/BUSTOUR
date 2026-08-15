"use client"

import { useActionState, useState } from "react"
import Link from "next/link"
import type { ContentBlock } from "@/lib/types"
import type { CollectionMeta, BlockField } from "@/lib/admin-config"
import { collectionListPath } from "@/lib/admin-config"
import { iconNames } from "@/components/site/block-icon"
import { saveBlockAction } from "@/app/admin/cms-actions"
import { Button, Input, Textarea, Label, Select, Card, CardBody } from "@/components/admin/ui"
import { MediaUploader, uploadedFileFromUrl, type UploadedFile } from "@/components/admin/media-uploader"

export function BlockForm({
  meta,
  block,
}: {
  meta: CollectionMeta
  block?: ContentBlock
}) {
  const [state, action, pending] = useActionState(saveBlockAction, null)
  const [image, setImage] = useState<UploadedFile | null>(() => {
    const value = block?.image ?? ""
    return value ? uploadedFileFromUrl(value) : null
  })

  const val = (field: BlockField): string => {
    if (!block) return ""
    switch (field) {
      case "buttonText":
        return String(block.extra.buttonText ?? "")
      case "features":
        return Array.isArray(block.extra.features) ? (block.extra.features as string[]).join("\n") : ""
      default:
        return (block[field as keyof ContentBlock] as string) ?? ""
    }
  }

  return (
    <form action={action}>
      <input type="hidden" name="collection" value={meta.key} />
      <input type="hidden" name="__returnTo" value={collectionListPath(meta)} />
      {block ? <input type="hidden" name="id" value={block.id} /> : null}

      <Card>
        <CardBody className="space-y-5">
          {state?.error ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-admin-danger" role="alert">
              {state.error}
            </p>
          ) : null}

          {meta.fields.map((field) => {
            const label = meta.labels[field] ?? field

            if (field === "icon") {
              return (
                <div key={field}>
                  <Label htmlFor={field}>{label}</Label>
                  <Select id={field} name="icon" defaultValue={val("icon") || iconNames[0]}>
                    {iconNames.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </Select>
                </div>
              )
            }

            if (field === "defaultOpen") {
              return (
                <label key={field} className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    name="defaultOpen"
                    defaultChecked={Boolean(block?.extra.defaultOpen)}
                    className="h-4 w-4 rounded border-admin-border accent-admin-fg"
                  />
                  <span className="text-sm text-admin-fg">{label}</span>
                </label>
              )
            }

            if (field === "body" || field === "features") {
              return (
                <div key={field}>
                  <Label htmlFor={field}>{label}</Label>
                  <Textarea
                    id={field}
                    name={field}
                    defaultValue={val(field)}
                    rows={field === "features" ? 4 : 3}
                  />
                </div>
              )
            }

            if (field === "image") {
              return (
                <div key={field}>
                  <Label htmlFor={field}>{label}</Label>
                  <input type="hidden" name="image" value={image?.url ?? ""} />
                  <MediaUploader value={image} onChange={setImage} accept={["image"]} label="" />
                </div>
              )
            }

            return (
              <div key={field}>
                <Label htmlFor={field}>{label}</Label>
                <Input id={field} name={field} defaultValue={val(field)} />
              </div>
            )
          })}

          <label className="flex items-center gap-2.5 border-t border-admin-border pt-4">
            <input
              type="checkbox"
              name="visible"
              defaultChecked={block ? block.visible : true}
              className="h-4 w-4 rounded border-admin-border accent-admin-fg"
            />
            <span className="text-sm text-admin-fg">Показывать на сайте</span>
          </label>

          <div className="flex items-center gap-2 border-t border-admin-border pt-5">
            <Button type="submit" disabled={pending}>
              {pending ? "Сохранение…" : "Сохранить"}
            </Button>
            <Link
              href={collectionListPath(meta)}
              className="inline-flex h-9 items-center rounded-md border border-admin-border px-4 text-sm text-admin-fg transition-colors hover:bg-admin-muted"
            >
              Отмена
            </Link>
          </div>
        </CardBody>
      </Card>
    </form>
  )
}
