"use client"

import { useEffect, useState } from "react"
import { TransferScheduleEditor } from "@/components/admin/transfer-schedule-editor"
import { cn } from "@/lib/utils"
import {
  parseScheduleDirectionHash,
  scheduleDirectionAnchor,
} from "@/lib/transfer-schedule-admin"
import type { TransferDirection, TransferSchedule } from "@/lib/types"

const TABS: { direction: TransferDirection; label: string }[] = [
  { direction: "outbound", label: "Из Минска в аэропорт" },
  { direction: "return", label: "Из аэропорта в Минск" },
]

/**
 * Direction segmented control inside left-rail «Расписания» panel.
 * Hash: #transfer-schedules-outbound | #transfer-schedules-return
 * Both editors stay mounted (hidden) so unsaved rows are not lost.
 */
export function TransferSchedulesPanel({
  transferId,
  outbound,
  inbound,
  pageKey,
  settings,
}: {
  transferId: number
  outbound: TransferSchedule[]
  inbound: TransferSchedule[]
  pageKey: string
  settings: Record<string, string>
}) {
  const [active, setActive] = useState<TransferDirection>("outbound")

  useEffect(() => {
    const sync = () => setActive(parseScheduleDirectionHash(window.location.hash))
    sync()
    window.addEventListener("hashchange", sync)
    return () => window.removeEventListener("hashchange", sync)
  }, [])

  function select(direction: TransferDirection) {
    setActive(direction)
    const anchor = scheduleDirectionAnchor(direction)
    window.history.replaceState(null, "", `#${anchor}`)
  }

  const counts: Record<TransferDirection, number> = {
    outbound: outbound.length,
    return: inbound.length,
  }

  return (
    <div id="transfer-schedules" className="space-y-4 scroll-mt-4">
      <div
        role="tablist"
        aria-label="Направление расписания"
        className="flex flex-wrap gap-1 rounded-lg border border-admin-border bg-admin-muted/40 p-1"
      >
        {TABS.map((tab) => {
          const selected = active === tab.direction
          const anchor = scheduleDirectionAnchor(tab.direction)
          return (
            <a
              key={tab.direction}
              id={anchor}
              href={`#${anchor}`}
              role="tab"
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              className={cn(
                "scroll-mt-4 rounded-md px-3 py-2 text-sm transition-colors",
                selected
                  ? "bg-admin-fg text-white shadow-sm"
                  : "text-admin-fg-muted hover:bg-white hover:text-admin-fg",
              )}
              onClick={(event) => {
                event.preventDefault()
                select(tab.direction)
              }}
            >
              {tab.label}
              <span className={cn("ml-1.5 tabular-nums", selected ? "text-white/80" : "text-admin-fg-subtle")}>
                ({counts[tab.direction]})
              </span>
            </a>
          )
        })}
      </div>

      <div className={active === "outbound" ? undefined : "hidden"} role="tabpanel" aria-hidden={active !== "outbound"}>
        <TransferScheduleEditor
          transferId={transferId}
          direction="outbound"
          schedules={outbound}
          pageKey={pageKey}
          settings={settings}
          hideCardTitle
        />
      </div>
      <div className={active === "return" ? undefined : "hidden"} role="tabpanel" aria-hidden={active !== "return"}>
        <TransferScheduleEditor
          transferId={transferId}
          direction="return"
          schedules={inbound}
          pageKey={pageKey}
          settings={settings}
          hideCardTitle
        />
      </div>
    </div>
  )
}
