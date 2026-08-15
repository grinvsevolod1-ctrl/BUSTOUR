"use client"

import { useState } from "react"
import { Plus, Trash2, Check, Dot, X, Star, Minus } from "lucide-react"
import type { IncludedGroup, IncludedMarker } from "@/lib/types"
import { Button, Input, Label, Select, IconButton } from "@/components/admin/ui"

const markerOptions: { value: IncludedMarker; label: string; Icon: typeof Check }[] = [
  { value: "check", label: "Галочка", Icon: Check },
  { value: "dot", label: "Точка", Icon: Dot },
  { value: "cross", label: "Крестик", Icon: X },
  { value: "star", label: "Звезда", Icon: Star },
  { value: "dash", label: "Тире", Icon: Minus },
]

const emptyGroup: IncludedGroup = { title: "", marker: "check", items: [] }

export function WhatIncludedBuilder({ groups: initial = [] }: { groups?: IncludedGroup[] }) {
  const [groups, setGroups] = useState<IncludedGroup[]>(initial.length ? initial : [{ ...emptyGroup }])

  function update(idx: number, patch: Partial<IncludedGroup>) {
    setGroups((g) => g.map((item, i) => (i === idx ? { ...item, ...patch } : item)))
  }

  return (
    <div className="space-y-3">
      {/* Serialized payload for the server action */}
      <input type="hidden" name="whatIncluded" value={JSON.stringify(groups)} />

      <div className="grid gap-3 rounded-lg bg-admin-muted p-3 sm:grid-cols-2">
        {groups.map((group, i) => {
          const Marker = markerOptions.find((m) => m.value === group.marker)?.Icon ?? Check
          return (
            <div key={i} className="space-y-3 rounded-md border border-admin-border bg-white p-4">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-sm font-medium text-admin-fg">
                  <Marker className="h-4 w-4 text-admin-fg-muted" /> Колонка {i + 1}
                </span>
                <IconButton
                  type="button"
                  tone="danger"
                  onClick={() => setGroups((g) => g.filter((_, idx) => idx !== i))}
                  aria-label="Удалить колонку"
                >
                  <Trash2 className="h-4 w-4" />
                </IconButton>
              </div>
              <div>
                <Label>Заголовок колонки</Label>
                <Input
                  value={group.title}
                  onChange={(e) => update(i, { title: e.target.value })}
                  placeholder="В стоимость включено"
                />
              </div>
              <div>
                <Label>Вид маркера</Label>
                <Select
                  value={group.marker}
                  onChange={(e) => update(i, { marker: e.target.value as IncludedMarker })}
                >
                  {markerOptions.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Пункты</Label>
                <div className="space-y-2">
                  {group.items.map((item, itemIndex) => (
                    <div key={itemIndex} className="flex items-center gap-2">
                      <Input
                        value={item}
                        onChange={(e) =>
                          update(i, {
                            items: group.items.map((current, currentIndex) =>
                              currentIndex === itemIndex ? e.target.value : current,
                            ),
                          })
                        }
                        placeholder="Проезд автобусом"
                      />
                      <IconButton
                        type="button"
                        tone="danger"
                        onClick={() =>
                          update(i, { items: group.items.filter((_, currentIndex) => currentIndex !== itemIndex) })
                        }
                        aria-label="Удалить пункт"
                      >
                        <Trash2 className="h-4 w-4" />
                      </IconButton>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => update(i, { items: [...group.items, ""] })}
                  >
                    <Plus className="h-4 w-4" /> Добавить пункт
                  </Button>
                </div>
                <p className="mt-1 text-xs text-admin-fg-subtle">
                  Пунктов: {group.items.filter((l) => l.trim()).length}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => setGroups((g) => [...g, { ...emptyGroup }])}
      >
        <Plus className="h-4 w-4" /> Колонка
      </Button>
    </div>
  )
}
