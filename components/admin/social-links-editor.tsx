"use client"

import { useState } from "react"
import { Button, Card, CardBody, CardHeader, CardTitle } from "@/components/admin/ui"
import {
  parseSocialLinks,
  SOCIAL_ICON_OPTIONS,
  type SocialIconId,
  type SocialLink,
} from "@/lib/social-links"

function emptyItem(): SocialLink {
  return {
    id: crypto.randomUUID(),
    name: "",
    url: "",
    icon: "telegram",
    showInHeader: false,
    showInFooter: true,
  }
}

export function SocialLinksEditor({ settings }: { settings: Record<string, string> }) {
  const [items, setItems] = useState<SocialLink[]>(() => parseSocialLinks(settings))

  const update = <K extends keyof SocialLink>(id: string, field: K, value: SocialLink[K]) =>
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    )

  const move = (index: number, delta: number) =>
    setItems((current) => {
      const next = [...current]
      const target = index + delta
      if (target < 0 || target >= next.length) return current
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Соцсети</CardTitle>
      </CardHeader>
      <CardBody className="space-y-3">
        <p className="text-sm text-admin-fg-muted">
          Название, ссылка, иконка. Чекбоксы — где показывать. Порядок — стрелками.
        </p>
        {items.map((item, index) => (
          <div
            key={item.id}
            className="space-y-3 rounded border border-admin-border p-3"
          >
            <div className="flex flex-wrap items-end gap-2">
              <label className="min-w-32 flex-1 text-sm">
                Название
                <input
                  className="mt-1 w-full rounded border p-2"
                  value={item.name}
                  onChange={(e) => update(item.id, "name", e.target.value)}
                />
              </label>
              <label className="min-w-52 flex-[2] text-sm">
                Ссылка
                <input
                  type="url"
                  className="mt-1 w-full rounded border p-2"
                  value={item.url}
                  onChange={(e) => update(item.id, "url", e.target.value)}
                />
              </label>
              <label className="min-w-36 text-sm">
                Иконка
                <select
                  className="mt-1 w-full rounded border p-2"
                  value={item.icon}
                  onChange={(e) => update(item.id, "icon", e.target.value as SocialIconId)}
                >
                  {SOCIAL_ICON_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
              <Button
                type="button"
                variant="secondary"
                disabled={index === 0}
                onClick={() => move(index, -1)}
                aria-label="Поднять"
              >
                ↑
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={index === items.length - 1}
                onClick={() => move(index, 1)}
                aria-label="Опустить"
              >
                ↓
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  setItems((current) => current.filter((entry) => entry.id !== item.id))
                }
              >
                Удалить
              </Button>
            </div>
            <div className="flex flex-wrap gap-4 text-sm">
              <label className="inline-flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={item.showInHeader}
                  onChange={(e) => update(item.id, "showInHeader", e.target.checked)}
                  className="h-4 w-4 rounded border-admin-border accent-admin-fg"
                />
                Показывать в хедере
              </label>
              <label className="inline-flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={item.showInFooter}
                  onChange={(e) => update(item.id, "showInFooter", e.target.checked)}
                  className="h-4 w-4 rounded border-admin-border accent-admin-fg"
                />
                Показывать в футере
              </label>
            </div>
          </div>
        ))}
        <Button type="button" variant="secondary" onClick={() => setItems((c) => [...c, emptyItem()])}>
          Добавить соцсеть
        </Button>
        <input type="hidden" name="social.links" value={JSON.stringify(items)} />
      </CardBody>
    </Card>
  )
}
