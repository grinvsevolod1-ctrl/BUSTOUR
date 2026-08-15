"use client"

import { useState } from "react"
import { Plus, Trash2 } from "lucide-react"
import { Button, Input, IconButton } from "@/components/admin/ui"
import { RichEditor } from "@/components/admin/rich-editor"

type FaqItem = { question: string; answer: string }
export type FaqGroupState = { title: string; items: FaqItem[] }

function toGroups(items: FaqItem[], groups?: FaqGroupState[]): FaqGroupState[] {
  if (groups && groups.length) return groups.map((g) => ({ title: g.title, items: [...g.items] }))
  if (items.length) return [{ title: "", items: [...items] }]
  return [{ title: "", items: [] }]
}

/**
 * FAQ editor.
 * - `mode="section"` (default for page sections): one titled Q/A list — add/remove via page sections, not inner blocks.
 * - `mode="groups"`: several titled groups (tours / country create).
 */
export function FaqEditor({
  items = [],
  groups: groupsProp,
  formId,
  mode = "section",
}: {
  items?: FaqItem[]
  groups?: FaqGroupState[]
  formId?: string
  mode?: "section" | "groups"
}) {
  const [groups, setGroups] = useState<FaqGroupState[]>(() => {
    const initial = toGroups(items, groupsProp)
    return mode === "section" ? [initial[0] ?? { title: "", items: [] }] : initial
  })
  const formAttr = formId ? { form: formId } : {}
  const allowMultiGroups = mode === "groups"

  return (
    <div className="space-y-4">
      {groups.map((group, gi) => (
        <div
          key={gi}
          className={allowMultiGroups ? "space-y-3 rounded-md border border-admin-border p-3" : "space-y-3"}
        >
          <div className="flex items-center justify-between gap-2">
            <Input
              name="faqGroupTitle"
              {...formAttr}
              defaultValue={group.title}
              placeholder={allowMultiGroups ? "Заголовок блока (например: Оплата)" : "Заголовок секции"}
              className="flex-1"
            />
            {allowMultiGroups && groups.length > 1 ? (
              <IconButton
                type="button"
                tone="danger"
                onClick={() => setGroups((s) => s.filter((_, idx) => idx !== gi))}
                aria-label="Удалить группу"
              >
                <Trash2 className="h-4 w-4" />
              </IconButton>
            ) : null}
          </div>

          {group.items.map((faq, i) => (
            <div key={`${gi}-${i}`} className="rounded-md border border-admin-border/70 bg-admin-muted/30 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-admin-fg">Вопрос {i + 1}</span>
                <IconButton
                  type="button"
                  tone="danger"
                  onClick={() =>
                    setGroups((s) =>
                      s.map((g, idx) =>
                        idx === gi ? { ...g, items: g.items.filter((_, j) => j !== i) } : g,
                      ),
                    )
                  }
                  aria-label="Удалить вопрос"
                >
                  <Trash2 className="h-4 w-4" />
                </IconButton>
              </div>
              <input type="hidden" name="faqGroup" value={gi} {...formAttr} />
              <Input
                name="faqQuestion"
                {...formAttr}
                defaultValue={faq.question}
                placeholder="Вопрос"
                className="mb-2"
              />
              <RichEditor
                name="faqAnswer"
                form={formId}
                defaultValue={faq.answer}
                placeholder="Ответ…"
                minHeight="140px"
              />
            </div>
          ))}

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() =>
              setGroups((s) =>
                s.map((g, idx) =>
                  idx === gi ? { ...g, items: [...g.items, { question: "", answer: "" }] } : g,
                ),
              )
            }
          >
            <Plus className="h-4 w-4" /> Вопрос
          </Button>
        </div>
      ))}

      {groups.every((g) => g.items.length === 0) ? (
        <p className="text-sm text-admin-fg-subtle">
          {allowMultiGroups
            ? "Вопросов нет — добавьте вопрос или ещё одну группу с своим заголовком."
            : "Вопросов нет — добавьте вопрос. Ещё одну секцию «Частые вопросы» добавьте в порядке секций."}
        </p>
      ) : null}

      {allowMultiGroups ? (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setGroups((s) => [...s, { title: "", items: [{ question: "", answer: "" }] }])}
        >
          <Plus className="h-4 w-4" /> Группа вопросов
        </Button>
      ) : null}
    </div>
  )
}
