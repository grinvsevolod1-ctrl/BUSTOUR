"use client"

import { useActionState, useEffect, useState } from "react"
import { Check } from "lucide-react"
import { saveSettingsAction } from "@/app/admin/cms-actions"
import { RichEditor } from "@/components/admin/rich-editor"
import { Button, Card, CardHeader, CardTitle, CardBody } from "@/components/admin/ui"

export function HotSeoForm({ seoHtml }: { seoHtml: string }) {
  const [state, action, pending] = useActionState(saveSettingsAction, null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (state && "ok" in state && state.ok) {
      setSaved(true)
      const t = setTimeout(() => setSaved(false), 2500)
      return () => clearTimeout(t)
    }
  }, [state])

  return (
    <form action={action}>
      {/* Mark this as a settings save without toggles */}
      <input type="hidden" name="__toggles" value="" />

      <Card>
        <CardHeader>
          <CardTitle>SEO-текст страницы</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <p className="text-xs text-admin-fg-subtle">
            Форматирование, заголовки, списки, ссылки. Отображается под виджетом горящих туров.
          </p>
          <RichEditor name="hot.seoHtml" defaultValue={seoHtml} placeholder="SEO-текст страницы горящих туров…" />
          {state && "error" in state && (
            <p className="text-sm text-red-500">{String(state.error)}</p>
          )}
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={pending}>
              {pending ? "Сохранение…" : "Сохранить SEO-текст"}
            </Button>
            {saved ? (
              <span className="inline-flex items-center gap-1 text-sm text-emerald-600">
                <Check className="h-4 w-4" /> Сохранено
              </span>
            ) : null}
          </div>
        </CardBody>
      </Card>
    </form>
  )
}
