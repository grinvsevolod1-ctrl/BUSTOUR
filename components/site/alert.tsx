import { Info, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { AlertKind } from "@/lib/types"
import { parseAlertKind } from "@/lib/alert-kind"
import { resolvePageAlert } from "@/lib/page-alert"

const styles: Record<AlertKind, { wrap: string; icon: string; Icon: typeof Info }> = {
  info: { wrap: "bg-accent text-ink", icon: "text-cyan-accent", Icon: Info },
  warning: { wrap: "bg-amber-50 text-ink", icon: "text-amber-600", Icon: AlertTriangle },
}

/** Single site alert — pages, tours, dates-table notes. */
export function Alert({
  text,
  type = "info",
  className,
}: {
  text?: string | null
  type?: AlertKind | string | null
  className?: string
}) {
  if (!text || !text.trim()) return null
  const kind = parseAlertKind(type)
  const s = styles[kind]
  const Icon = s.Icon
  return (
    <div
      className={cn("flex items-start gap-3 rounded-lg px-4 py-3", s.wrap, className)}
      role={kind === "warning" ? "alert" : "status"}
    >
      <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", s.icon)} strokeWidth={1.75} aria-hidden />
      <p className="text-sm leading-relaxed">{text}</p>
    </div>
  )
}

/** Settings-backed page alert: `{prefix}.alertText` + `{prefix}.alertType`. */
export function PageAlert({
  settings,
  prefix,
  fallbackPrefix,
  className,
}: {
  settings: Record<string, string>
  prefix: string
  /** Legacy key prefix when primary is empty (e.g. `egipet` vs `country:avia:egipet`). */
  fallbackPrefix?: string
  className?: string
}) {
  const { text, type } = resolvePageAlert(settings, prefix, fallbackPrefix)
  return <Alert text={text} type={type} className={className} />
}
