"use client"

import { Children, useEffect, useRef, useState } from "react"
import { flushSync } from "react-dom"
import { cn } from "@/lib/utils"

export type EditorWorkspaceGroup = {
  id: string
  label: string
  badge: boolean
  anchorIds: string[]
}

export function EditorWorkspace({
  groups,
  children,
}: {
  groups: EditorWorkspaceGroup[]
  children: React.ReactNode
}) {
  const panels = Children.toArray(children)
  const [activeId, setActiveId] = useState(groups[0]?.id ?? "")
  const groupsRef = useRef(groups)
  const activeIdRef = useRef(activeId)
  const workspaceRef = useRef<HTMLDivElement>(null)
  groupsRef.current = groups
  activeIdRef.current = activeId

  useEffect(() => {
    const workspace = workspaceRef.current
    if (!workspace) return

    function revealInvalidPanel(event: Event) {
      const target = event.target
      if (!(target instanceof Element)) return
      const panel = target.closest<HTMLElement>('[role="tabpanel"]')
      const panelId = panel?.id ?? ""
      if (!panelId.startsWith("editor-panel-")) return
      const groupId = panelId.slice("editor-panel-".length)
      if (!groupsRef.current.some((group) => group.id === groupId)) return
      if (activeIdRef.current === groupId) return
      flushSync(() => {
        activeIdRef.current = groupId
        setActiveId(groupId)
      })
    }

    workspace.addEventListener("invalid", revealInvalidPanel, true)
    return () => workspace.removeEventListener("invalid", revealInvalidPanel, true)
  }, [])

  useEffect(() => {
    const activateHash = () => {
      const target = window.location.hash.slice(1)
      if (!target) return
      const group = groupsRef.current.find((item) => item.anchorIds.includes(target))
      const fallbackPanel = group
        ? null
        : document.getElementById(target)?.closest<HTMLElement>('[role="tabpanel"]')
      const fallbackGroup = fallbackPanel?.id.startsWith("editor-panel-")
        ? groupsRef.current.find((item) => item.id === fallbackPanel.id.slice("editor-panel-".length))
        : undefined
      const targetGroup = group ?? fallbackGroup
      if (targetGroup) setActiveId(targetGroup.id)
      window.setTimeout(() => document.getElementById(target)?.scrollIntoView({ block: "start" }), 0)
    }

    activateHash()
    window.addEventListener("hashchange", activateHash)
    return () => window.removeEventListener("hashchange", activateHash)
  }, [])

  function selectGroup(id: string, anchorId?: string) {
    setActiveId(id)
    const hash = anchorId ? `#${anchorId}` : ""
    window.history.replaceState(null, "", hash || window.location.pathname + window.location.search)
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLAnchorElement>, index: number) {
    const direction = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0
    if (!direction) return
    event.preventDefault()
    const nextIndex = (index + direction + groups.length) % groups.length
    const next = groups[nextIndex]
    selectGroup(next.id, next.anchorIds[0])
    event.currentTarget.parentElement?.parentElement
      ?.querySelectorAll<HTMLAnchorElement>('[role="tab"]')[nextIndex]
      ?.focus()
  }

  return (
    <div ref={workspaceRef} className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start">
      <nav
        className="sticky top-20 z-20 -mx-1 flex gap-1 overflow-x-auto bg-admin-bg/95 px-1 py-1 backdrop-blur-sm lg:top-4 lg:mx-0 lg:block lg:overflow-visible lg:bg-transparent lg:p-0"
        aria-label="Разделы редактора"
        role="tablist"
      >
        <div className="flex min-w-max gap-1 lg:block lg:space-y-1">
          {groups.map((group, index) => {
            const selected = activeId === group.id
            const href = `#${group.anchorIds[0] ?? group.id}`
            return (
              <a
                key={group.id}
                id={`editor-tab-${group.id}`}
                href={href}
                role="tab"
                aria-current={selected ? "page" : undefined}
                aria-selected={selected}
                aria-controls={`editor-panel-${group.id}`}
                tabIndex={selected ? 0 : -1}
                onClick={(event) => {
                  event.preventDefault()
                  selectGroup(group.id, group.anchorIds[0])
                }}
                onKeyDown={(event) => handleKeyDown(event, index)}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors lg:w-full",
                  selected
                    ? "bg-admin-fg text-white shadow-sm"
                    : "text-admin-fg-muted hover:bg-admin-muted hover:text-admin-fg",
                )}
              >
                <span className="truncate">{group.label}</span>
                <span
                  className={cn(
                    "ml-auto h-2 w-2 shrink-0 rounded-full",
                    group.badge ? "bg-emerald-400" : selected ? "bg-white/40" : "bg-admin-border",
                  )}
                  aria-label={group.badge ? "Есть заполненные данные" : "Пока пусто"}
                  title={group.badge ? "Есть заполненные данные" : "Пока пусто"}
                />
              </a>
            )
          })}
        </div>
      </nav>

      <div className="min-w-0">
        {groups.map((group, index) => (
          <section
            key={group.id}
            id={`editor-panel-${group.id}`}
            role="tabpanel"
            aria-labelledby={`editor-tab-${group.id}`}
            hidden={activeId !== group.id}
            tabIndex={0}
            className="space-y-4 outline-none"
          >
            {panels[index]}
          </section>
        ))}
      </div>
    </div>
  )
}
