"use client"

import {
  createContext,
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react"
import { Check, ExternalLink, Eye, EyeOff, RotateCcw, Save } from "lucide-react"
import Link from "next/link"
import { saveSettingsAction, validateSettingsAction } from "@/app/admin/cms-actions"
import { Button } from "@/components/admin/ui"
import { EditorWorkspace, type EditorWorkspaceGroup } from "@/components/admin/editor-workspace"
import { cn } from "@/lib/utils"
import { TOURVISOR_WIDGET_HINT } from "@/lib/tourvisor-widget"
import { toast } from "sonner"
import { DraftRegistry, type DraftContributor } from "@/components/admin/draft-coordinator"
import type { AdminSaveResult } from "@/lib/admin-save-state"

export type PageSettingsFormContextValue = {
  formId: string
  registerDraft(contributor: DraftContributor): () => void
  requestSave(): Promise<AdminSaveResult>
  saving: boolean
}

export const PageSettingsFormContext = createContext<PageSettingsFormContextValue | null>(null)

type PageSaveAction = (prev: unknown, formData: FormData) => Promise<{ ok?: boolean; error?: string; fieldErrors?: Record<string, string>; firstError?: import("@/lib/admin-save-state").AdminFieldError; partial?: { savedSourceIds: string[]; failedSourceId: string } }>

interface PageSettingsFormProps {
  children: React.ReactNode
  saveAction?: PageSaveAction
  /** Page title shown in the sticky header */
  title: string
  /** Optional subtitle / description */
  description?: string
  /** "Open page" link href */
  pageHref?: string
  /** Tourvisor widget editor URL (pro.tourvisor.ru/module/search/...) */
  widgetHref?: string
  /** Optional content rendered directly under the header, OUTSIDE the settings
   *  <form> — use for cards that submit to a different action (own <form>). */
  beforeForm?: React.ReactNode
  /** id of the settings form; the header's Save button targets it via form={formId} */
  formId?: string
  /**
   * @deprecated Do not pass section visibility keys here. PageSectionsManager
   * toggles them via eye buttons; listing them in `__toggles` made Save force
   * every missing key to "0" and hide sections after refresh.
   */
  toggleKeys?: string
  /**
   * Settings key for page visibility, e.g. "aviatory.visible" or "country:egipet.visible".
   * When provided, renders an Eye/EyeOff toggle in the header.
   * Default value (when key is absent from settings) is visible = true.
   */
  visibilityKey?: string
  /** Current visibility value read from settings on the server. Defaults to true. */
  defaultVisible?: boolean
  /**
   * Optional warning shown when a parent page is hidden.
   * E.g. "Главная авиатуров скрыта — эта страница тоже недоступна."
   */
  parentHiddenWarning?: string
  workspaceGroups?: EditorWorkspaceGroup[]
  workspaceBeforeForm?: React.ReactNode
  workspaceFormAfter?: React.ReactNode
  /**
   * Panels between "Основное" (before) and the settings form ("Контент").
   * Use for CRUD lists that own their own forms (staff, licenses).
   * workspaceGroups must include a matching group in the same position.
   */
  workspaceMidPanels?: React.ReactNode[]
  /**
   * Extra standalone panels (each its own left-rail tab) rendered between the
   * "Контент" panel and the "Порядок секций" panel. Use for blocks that own a
   * separate <form> (FAQ, tables builder) and therefore can't live inside the
   * settings form. The workspaceGroups array must list a matching group for
   * each panel in the same position (main, …mid, content, …extra, order).
   */
  workspaceExtraPanels?: React.ReactNode[]
  workspaceAfterForm?: React.ReactNode
}

/**
 * Wraps an entire admin page in a single <form>.
 * Renders a sticky header bar with the page title, "Open page" link,
 * "Cancel" (reset) and "Save" buttons — always visible while scrolling.
 * All SectionFieldsForm children should use hideSubmit={true}.
 */
export function PageSettingsForm({
  children, title, description, pageHref, widgetHref, beforeForm,
  formId = "page-settings-form", toggleKeys: _toggleKeys = "",
  visibilityKey, defaultVisible = true, parentHiddenWarning,
  workspaceGroups, workspaceBeforeForm, workspaceFormAfter, workspaceMidPanels, workspaceExtraPanels, workspaceAfterForm, saveAction = saveSettingsAction,
}: PageSettingsFormProps) {
  void _toggleKeys
  const [state, setState] = useState<Awaited<ReturnType<PageSaveAction>> | null>(null)
  const [saving, setSaving] = useState(false)
  const savePromise = useRef<Promise<AdminSaveResult> | null>(null)
  const [saved, setSaved] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const [dirty, setDirty] = useState(false)
  const draftRegistry = useRef(new DraftRegistry())
  const registerDraft = useCallback((contributor: DraftContributor) => {
    return draftRegistry.current.register(contributor)
  }, [])

  const [nativeFormDirty, setNativeFormDirty] = useState(false)
  useEffect(() => {
    if (state && "ok" in state && state.ok) setNativeFormDirty(false)
  }, [state])

  const anyContributorDirty = useMemo(() => {
    return draftRegistry.current.snapshot().some((c) => c.isDirty())
  }, [dirty, saving, state, saved])

  const effectiveDirty = nativeFormDirty || anyContributorDirty
  const dirtyCount = useMemo(() => {
    const fromForm = nativeFormDirty ? 1 : 0
    const fromContribs = draftRegistry.current.snapshot().filter((c) => c.isDirty()).length
    return fromForm + fromContribs
  }, [nativeFormDirty, saving, state, saved])

  useEffect(() => {
    setDirty(effectiveDirty)
  }, [effectiveDirty])

  function dirtySaveLabel(count: number): string {
    if (count <= 0) return "Сохранить"
    if (count === 1) return `Сохранить · 1 изменение`
    if (count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 12 || count % 100 > 14)) return `Сохранить · ${count} изменения`
    return `Сохранить · ${count} изменений`
  }

  useEffect(() => {
    const form = formRef.current
    if (!form) return
    const markDirty = () => setNativeFormDirty(true)
    form.addEventListener("input", markDirty)
    form.addEventListener("change", markDirty)
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty) return
      event.preventDefault()
    }
    window.addEventListener("beforeunload", beforeUnload)
    return () => {
      form.removeEventListener("input", markDirty)
      form.removeEventListener("change", markDirty)
      window.removeEventListener("beforeunload", beforeUnload)
    }
  }, [dirty])

  useEffect(() => {
    if (!state || !("fieldErrors" in state) || !state.fieldErrors) return
    const [key, message] = Object.entries(state.fieldErrors)[0] ?? []
    if (!key || !message) return
    const control = document.getElementById(`sf-${key}`)
    if (!(control instanceof HTMLElement)) return
    control.setAttribute("aria-invalid", "true")
    control.scrollIntoView({ behavior: "smooth", block: "center" })
    window.setTimeout(() => control.focus(), 150)
  }, [state])

  // Visibility toggle — independent from the main save form
  const [visible, setVisible] = useState(defaultVisible)
  const [visTogglePending, startVisToggle] = useTransition()

  function toggleVisibility() {
    if (!visibilityKey) return
    const prev = visible
    const next = !visible
    setVisible(next)
    startVisToggle(async () => {
      const fd = new FormData()
      fd.set(visibilityKey, next ? "1" : "0")
      try {
        const result = await saveSettingsAction(null, fd)
        if (result && "error" in result) {
          setVisible(prev)
          toast.error(`Не удалось изменить видимость: ${String(result.error)}`)
          return
        }
        toast.success(next ? "Страница опубликована" : "Страница скрыта")
      } catch (error: unknown) {
        setVisible(prev)
        const message = error instanceof Error ? error.message : "Неизвестная ошибка"
        toast.error(`Не удалось изменить видимость: ${message}`)
      }
    })
  }


  function handleReset() {
    formRef.current?.reset()
    setNativeFormDirty(false)
    const all = draftRegistry.current.snapshot()
    for (const contributor of all) contributor.reset()
    setDirty(false)
    setState(null)
    setPipelineError(null)
  }

  /** Error banner shown when pre-save pipeline (standalone forms / order sync) rejects. */
  const [pipelineError, setPipelineError] = useState<string | null>(null)

  const revealFailure = useCallback((result: Extract<AdminSaveResult, { ok: false }>) => {
    setPipelineError(result.error)
    if (result.firstError?.tabHash) history.replaceState(null, "", result.firstError.tabHash)
    const control = result.firstError?.focusId ? document.getElementById(result.firstError.focusId) : null
    if (control instanceof HTMLElement) {
      control.setAttribute("aria-invalid", "true")
      control.scrollIntoView({ behavior: "smooth", block: "center" })
      window.setTimeout(() => control.focus(), 150)
    }
  }, [])

  const requestSave = useCallback((): Promise<AdminSaveResult> => {
    if (savePromise.current) return savePromise.current
    const operation = (async (): Promise<AdminSaveResult> => {
      setSaving(true)
      setPipelineError(null)
      const form = formRef.current
      if (!form) return { ok: false, error: "Форма страницы недоступна" }
      const controls = [...document.querySelectorAll<HTMLElement>(`[form="${CSS.escape(formId)}"]`)]
      const invalid = [form, ...controls].find((item) => "checkValidity" in item && !(item as HTMLInputElement).checkValidity())
      if (invalid) {
        if ("reportValidity" in invalid) (invalid as HTMLInputElement).reportValidity()
        return { ok: false, error: "Проверьте заполнение обязательных полей" }
      }
      const contributors = draftRegistry.current.snapshot().filter((item) => item.isDirty())
      for (const contributor of contributors) {
        const result = await contributor.validate?.()
        if (result && !result.ok) { revealFailure(result); return result }
      }
      const submitted = new FormData(form)
      for (const contributor of contributors) await contributor.append?.(submitted)
      const validation = await validateSettingsAction(submitted)
      if (!("ok" in validation)) {
        const [field, message] = Object.entries(validation.fieldErrors ?? {})[0] ?? []
        const failure: Extract<AdminSaveResult, { ok: false }> = {
          ok: false,
          error: validation.error,
          fieldErrors: validation.fieldErrors,
          firstError: field && message ? { field, message, focusId: `sf-${field}`, tabHash: "#settings-content" } : undefined,
        }
        revealFailure(failure); return failure
      }
      const pageResult = await saveAction(null, submitted)
      if (!pageResult.ok) {
        const [field, message] = Object.entries(pageResult.fieldErrors ?? {})[0] ?? []
        const failure: Extract<AdminSaveResult, { ok: false }> = {
          ok: false,
          error: pageResult.error ?? "Не удалось сохранить страницу",
          fieldErrors: pageResult.fieldErrors,
          partial: pageResult.partial,
          firstError: pageResult.firstError ?? (field && message
            ? { field, message, focusId: `sf-${field}`, tabHash: "#settings-content" }
            : undefined),
        }
        setState(pageResult); revealFailure(failure); return failure
      }
      const savedSourceIds: string[] = []
      for (const contributor of contributors) {
        if (!contributor.save) continue
        const result = await contributor.save()
        if (!result.ok) {
          const failure = { ...result, partial: { savedSourceIds, failedSourceId: contributor.id } }
          revealFailure(failure); return failure
        }
        savedSourceIds.push(contributor.id)
      }
      contributors.forEach((item) => item.commitBaseline())
      setDirty(false); setState(pageResult); setSaved(true)
      window.setTimeout(() => setSaved(false), 3000)
      toast.success("Настройки сохранены")
      return { ok: true }
    })().catch((error: unknown) => {
      const failure = { ok: false as const, error: error instanceof Error ? error.message : "Не удалось сохранить страницу" }
      revealFailure(failure); return failure
    }).finally(() => { setSaving(false); savePromise.current = null })
    savePromise.current = operation
    return operation
  }, [formId, revealFailure, saveAction])

  const formContext = useMemo<PageSettingsFormContextValue>(
    () => ({ formId, registerDraft, requestSave, saving }),
    [formId, registerDraft, requestSave, saving],
  )

  useEffect(() => {
    let aborted = false
    function onKeyDown(event: KeyboardEvent) {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "s") return
      const target = event.target
      if (target instanceof HTMLElement && target.isContentEditable) {
        // allow browser/editor default in contenteditable only if we don't own save —
        // still save page settings; prevent browser save dialog
      }
      event.preventDefault()
      if (saving || aborted) return
      aborted = true
      void requestSave()
        .then((result) => {
          if (!result.ok) return
        })
        .finally(() => {
          window.setTimeout(() => { aborted = false }, 1500)
        })
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [requestSave, saving])

  return (
    <PageSettingsFormContext.Provider value={formContext}>
      <div>
      {/* Sticky header — lives OUTSIDE the <form> so beforeForm (a separate-action
          card) can sit under it; Save targets the form via the form={formId} attr */}
      <div className={cn(
        "sticky top-0 z-40 -mx-6 mb-6 border-b bg-white/95 px-6 shadow-sm backdrop-blur-sm",
        !visible && visibilityKey
          ? "border-amber-200 bg-amber-50/95"
          : "border-admin-border",
      )}>
        {/* Parent hidden warning */}
        {parentHiddenWarning && (
          <div className="flex items-center gap-2 border-b border-amber-200 py-2 text-xs text-amber-700">
            <EyeOff className="h-3.5 w-3.5 shrink-0" />
            {parentHiddenWarning}
          </div>
        )}
        <div className="flex items-center justify-between gap-4 py-3">
          {/* Left: title + visibility badge */}
          <div className="min-w-0 flex items-center gap-2">
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold text-admin-fg">{title}</h1>
              {description && (
                <p className="truncate text-xs text-admin-fg-muted">{description}</p>
              )}
            </div>
            {visibilityKey && (
              <span className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium",
                visible
                  ? "bg-green-100 text-green-700"
                  : "bg-amber-100 text-amber-700",
              )}>
                {visible ? "Опубликована" : "Скрыта"}
              </span>
            )}
          </div>

          {/* Right: actions */}
          <div className="flex shrink-0 items-center gap-2">
            {/* Saved indicator */}
            {saved && (
              <span className="flex items-center gap-1 text-xs text-green-700">
                <Check className="h-3.5 w-3.5" />
                Сохранено
              </span>
            )}
            {/* Error indicators */}
            {(state && "error" in state) || pipelineError ? (
              <span className="text-xs text-red-600" role="alert" aria-live="assertive">
                {(state && "error" in state) ? String(state.error) : pipelineError}
              </span>
            ) : null}

            {/* Page visibility toggle */}
            {visibilityKey && (
              <button
                type="button"
                onClick={toggleVisibility}
                disabled={visTogglePending}
                title={visible ? "Скрыть страницу (404 для посетителей)" : "Опубликовать страницу"}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-40",
                  visible
                    ? "border-admin-border text-admin-fg-muted hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700"
                    : "border-green-300 bg-green-50 text-green-700 hover:bg-green-100",
                )}
              >
                {visible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                {visible ? "Скрыть" : "Опубликовать"}
              </button>
            )}

            {/* Tourvisor widget editor link */}
            {widgetHref && (
              <Link
                href={widgetHref}
                target="_blank"
                title={TOURVISOR_WIDGET_HINT}
                aria-label={TOURVISOR_WIDGET_HINT}
                className="inline-flex items-center gap-1.5 rounded-md border border-admin-border px-2.5 py-1.5 text-xs text-admin-fg-muted transition-colors hover:bg-admin-muted hover:text-admin-fg"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Виджет
              </Link>
            )}

            {/* Open page link */}
            {pageHref && (
              <Link
                href={pageHref}
                target="_blank"
                className="inline-flex items-center gap-1.5 rounded-md border border-admin-border px-2.5 py-1.5 text-xs text-admin-fg-muted transition-colors hover:bg-admin-muted hover:text-admin-fg"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Открыть
              </Link>
            )}

            {/* Cancel */}
            <button
              type="button"
              onClick={handleReset}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-md border border-admin-border px-2.5 py-1.5 text-xs text-admin-fg-muted transition-colors hover:bg-admin-muted hover:text-admin-fg disabled:opacity-40"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Отмена
            </button>

            {/* Save — targets the settings form; also programmatically submits extra forms */}
            <Button
              type="submit"
              form={formId}
              size="sm"
              disabled={saving}
              className="gap-1.5"
              title="Ctrl+S / ⌘S"
              onClick={async (event) => {
                event.preventDefault()
                if (!(await requestSave()).ok) return
              }}
            >
              <Save className="h-3.5 w-3.5" />
              {saving ? "Сохранение…" : dirtySaveLabel(dirtyCount)}
            </Button>
          </div>
        </div>
      </div>

      {workspaceGroups ? (
        <>
          {/* Always-mounted form shell (not inside a hidden tabpanel) so sticky Save +
              HTML form= fields from other panels actually submit. */}
          <form id={formId} ref={formRef} onSubmit={(event) => { event.preventDefault(); void requestSave() }} className="hidden" aria-hidden="true">
            {/* ponytail: never list section.* in __toggles — Save would zero them */}
            <input type="hidden" name="__toggles" value="" />
          </form>
          <EditorWorkspace groups={workspaceGroups}>
            <Fragment key="workspace-before">{workspaceBeforeForm}</Fragment>
            {workspaceMidPanels?.map((panel, i) => (
              <Fragment key={`workspace-mid-${i}`}>{panel}</Fragment>
            ))}
            <Fragment key="workspace-form">
              {children}
              {workspaceFormAfter}
            </Fragment>
            {workspaceExtraPanels?.map((panel, i) => (
              <Fragment key={`workspace-extra-${i}`}>{panel}</Fragment>
            ))}
            <Fragment key="workspace-after">{workspaceAfterForm}</Fragment>
          </EditorWorkspace>
        </>
      ) : (
        <>
          {beforeForm}
          <form id={formId} ref={formRef} onSubmit={(event) => { event.preventDefault(); void requestSave() }}>
            <input type="hidden" name="__toggles" value="" />
            {children}
          </form>
        </>
      )}
      </div>
    </PageSettingsFormContext.Provider>
  )
}
