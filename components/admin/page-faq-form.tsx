"use client"

import { useActionState, useContext, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Check } from "lucide-react"
import { savePageFaqsAction } from "@/app/admin/cms-actions"
import { FaqEditor, type FaqGroupState } from "@/components/admin/faq-editor"
import { groupFaqBlocks } from "@/lib/faq-form"
import { faqStoragePage, pageFaqFormId } from "@/lib/faq-slots"
import type { ContentBlock } from "@/lib/types"
import { PageSettingsFormContext } from "@/components/admin/page-settings-form"
import type { AdminSaveResult } from "@/lib/admin-save-state"

const tabHash = "#sec-faq" as const
const slotAnchorIds: Record<string, string> = { faq: "sec-faq", faq2: "s-faq2", faq3: "s-faq3", faq4: "s-faq4", faq5: "s-faq5" }

/** One FAQ section slot (faq / faq2 / …). Portal form avoids nested &lt;form&gt;. */
export function PageFaqForm({
  pageKey,
  faqs,
  sectionSlot = "faq",
}: {
  pageKey: string
  faqs: ContentBlock[]
  /** Short section key: `faq`, `faq2`, … */
  sectionSlot?: string
}) {
  const formId = pageFaqFormId(pageKey, sectionSlot)
  const [state, action] = useActionState(savePageFaqsAction, null)
  const [mounted, setMounted] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const baselineRef = useRef("")
  const pageForm = useContext(PageSettingsFormContext)
  useEffect(() => setMounted(true), [])

  const focusAnchor = slotAnchorIds[sectionSlot] ?? `faq-slot-${sectionSlot}`

  useEffect(() => {
    if (!pageForm) return
    return pageForm.registerDraft({
      id: `faq:${pageKey}:${sectionSlot}`,
      label: `FAQ${sectionSlot !== "faq" ? ` · ${sectionSlot}` : ""}`,
      tabHash,
      isDirty: () => {
        const form = formRef.current
        return Boolean(form && JSON.stringify([...new FormData(form).entries()]) !== baselineRef.current)
      },
      validate(): AdminSaveResult {
        const form = formRef.current
        if (!form) return { ok: true }
        const fd = new FormData(form)
        const questions = fd.getAll("faqQuestion").map((v: FormDataEntryValue) => String(v).trim())
        const answers = fd.getAll("faqAnswer").map((v: FormDataEntryValue) => String(v).trim())
        if (questions.length !== answers.length) {
          return { ok: false, error: "FAQ: количество вопросов и ответов не совпадает", firstError: { field: "faqQuestion", message: "Проверьте заполнение FAQ", focusId: focusAnchor, tabHash } }
        }
        for (let i = 0; i < questions.length; i++) {
          const q = questions[i]!; const a = answers[i]!
          if ((q && !a) || (!q && a)) {
            return { ok: false, error: `FAQ: вопрос ${i + 1} — нужно заполнить и вопрос, и ответ`, firstError: { field: "faqQuestion", message: "Заполните оба поля: вопрос и ответ", focusId: focusAnchor, tabHash } }
          }
        }
        return { ok: true }
      },
      append(aggregateFd: FormData) {
        const form = formRef.current
        if (!form) return
        const portalFd = new FormData(form)
        const storage = faqStoragePage(pageKey, sectionSlot)
        const entries: [string, FormDataEntryValue][] = []
        for (const [name, value] of portalFd.entries()) {
          if (name === "__page") continue
          if (name === "__slot") continue
          if (name === "__storage") continue
          entries.push([name, value])
        }
        if (!entries.length) return
        const namespace = `__faqData:${storage}`
        const existing = aggregateFd.get(namespace)
        const all = existing ? JSON.parse(String(existing)) as [string, FormDataEntryValue][] : [] as [string, FormDataEntryValue][]
        all.push(...entries)
        aggregateFd.set(namespace, JSON.stringify(all))
      },
      commitBaseline() {
        if (formRef.current) baselineRef.current = JSON.stringify([...new FormData(formRef.current).entries()])
      },
      reset() { formRef.current?.reset() },
    })
  }, [pageForm, pageKey, sectionSlot, focusAnchor])

  const savedGroups = state && "groups" in state ? state.groups : null
  const adminGroups: FaqGroupState[] = savedGroups
    ? savedGroups.map((g) => ({ title: g.title, items: g.items }))
    : groupFaqBlocks(faqs, "").map((g) => ({
        title: g.title,
        items: g.items.map((b) => ({ question: b.title, answer: b.body })),
      }))

  const initial = adminGroups.length ? adminGroups : [{ title: "", items: [] }]

  return (
    <>
      {mounted &&
        createPortal(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          <form ref={formRef} id={formId} action={action as any} style={{ display: "none" }}>
            <input type="hidden" name="__page" value={pageKey} />
            <input type="hidden" name="__slot" value={sectionSlot} />
            <input type="hidden" name="__storage" value={faqStoragePage(pageKey, sectionSlot)} />
          </form>,
          document.body,
        )}

      <div id={focusAnchor} className="space-y-3 scroll-mt-4">
        <FaqEditor
          key={state && "savedAt" in state ? state.savedAt : 0}
          groups={initial}
          formId={formId}
          mode="section"
        />
        {state && "error" in state && <p className="text-sm text-red-500">{state.error}</p>}
        {state && "ok" in state && (
          <span className="flex items-center gap-1 text-xs text-green-700">
            <Check className="h-3.5 w-3.5" /> Сохранено
          </span>
        )}
        {/* Save via PageSettingsForm header via registerDraft aggregate append */}
      </div>
    </>
  )
}
