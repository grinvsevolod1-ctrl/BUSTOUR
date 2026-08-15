"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronDown, Save } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAdminDirty } from "@/components/admin/admin-dirty-provider"

/* ---------- Card ---------- */
export function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("rounded-lg border border-admin-border bg-white", className)}
      {...props}
    />
  )
}

export function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("border-b border-admin-border px-5 py-4", className)} {...props} />
}

export function CardTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return <h3 className={cn("text-sm font-semibold text-admin-fg", className)} {...props} />
}

export function CardBody({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("p-5", className)} {...props} />
}

export function Alert({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: "info" | "warning" | "danger"
  title?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "rounded-lg border p-4 text-sm leading-relaxed",
        tone === "info"
          ? "border-blue-200 bg-blue-50 text-blue-800"
          : tone === "warning"
            ? "border-amber-200 bg-amber-50 text-amber-800"
            : "border-red-200 bg-red-50 text-red-800",
        className,
      )}
      role={tone === "danger" ? "alert" : "status"}
    >
      {title ? <div className="mb-1 font-semibold text-pretty">{title}</div> : null}
      {children}
    </div>
  )
}

/* ---------- Button ---------- */
type ButtonVariant = "primary" | "secondary" | "danger" | "ghost"
type ButtonSize = "sm" | "md"

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-ring focus-visible:ring-offset-1"

const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-admin-fg text-white hover:bg-admin-fg/90 border border-admin-fg",
  secondary: "bg-white text-admin-fg border border-admin-border hover:bg-admin-muted",
  danger: "bg-white text-admin-danger border border-admin-border hover:bg-admin-danger/10 hover:border-admin-danger/40",
  ghost: "bg-transparent text-admin-fg-muted hover:bg-admin-muted hover:text-admin-fg",
}

const buttonSizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-9 px-4 text-sm",
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: React.ComponentProps<"button"> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return (
    <button className={cn(buttonBase, buttonVariants[variant], buttonSizes[size], className)} {...props} />
  )
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  onClick,
  href,
  target,
  ...props
}: React.ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize }) {
  const { confirmDiscard, runWithNavigationBypass } = useAdminDirty()
  const router = useRouter()
  const isHashOnly = typeof href === "string" && href.startsWith("#")
  const isBlank = target === "_blank"
  return (
    <Link
      href={href}
      target={target}
      onClick={async (e) => {
        if (onClick) onClick(e)
        if (e.defaultPrevented || isHashOnly || isBlank) return
        e.preventDefault()
        const discard = await confirmDiscard()
        if (!discard) return
        const hrefStr = String(href)
        await runWithNavigationBypass(async () => {
          if (target) {
            window.open(hrefStr, target)
          } else {
            router.push(hrefStr)
          }
        })
      }}
      className={cn(buttonBase, buttonVariants[variant], buttonSizes[size], className)}
      {...props}
    />
  )
}

/* ---------- Form controls ---------- */
export function Label({
  className,
  required = false,
  children,
  ...props
}: React.ComponentProps<"label"> & { required?: boolean }) {
  return (
    <label className={cn("mb-1.5 block text-xs font-medium text-admin-fg", className)} {...props}>
      {children}
      {required ? <span className="ml-0.5 text-admin-danger" aria-hidden="true">*</span> : null}
    </label>
  )
}

const fieldBase =
  "w-full rounded-md border border-admin-border bg-white px-3 py-2 text-sm text-admin-fg placeholder:text-admin-fg-subtle transition-colors focus:border-admin-fg focus:outline-none focus:ring-2 focus:ring-admin-ring disabled:opacity-50"

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return <input className={cn(fieldBase, className)} {...props} />
}

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return <textarea className={cn(fieldBase, "min-h-[80px] resize-y", className)} {...props} />
}

export function Select({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      className={cn(fieldBase, "cursor-pointer appearance-none bg-[length:16px] bg-[right_0.5rem_center] bg-no-repeat pr-9", className)}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2'%3e%3cpath d='m6 9 6 6 6-6'/%3e%3c/svg%3e\")",
      }}
      {...props}
    />
  )
}

/* ---------- Badge ---------- */
type BadgeTone = "neutral" | "blue" | "amber" | "green" | "red"
const badgeTones: Record<BadgeTone, string> = {
  neutral: "bg-admin-muted text-admin-fg-muted border-admin-border",
  blue: "bg-blue-50 text-blue-700 border-blue-200",
  amber: "bg-amber-50 text-amber-700 border-amber-200",
  green: "bg-emerald-50 text-emerald-700 border-emerald-200",
  red: "bg-red-50 text-red-700 border-red-200",
}

export function Badge({
  tone = "neutral",
  className,
  ...props
}: React.ComponentProps<"span"> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
        badgeTones[tone],
        className,
      )}
      {...props}
    />
  )
}

/* ---------- Page header ---------- */
export function PageHeader({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children?: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight text-admin-fg">{title}</h1>
        {description ? <p className="text-sm text-admin-fg-muted">{description}</p> : null}
      </div>
      {children ? <div className="flex shrink-0 items-center gap-2">{children}</div> : null}
    </div>
  )
}

/* ---------- Table ---------- */
export function TableWrap({ className, children, ...props }: React.ComponentProps<"table">) {
  return (
    <div className="overflow-x-auto rounded-lg border border-admin-border bg-white">
      <table className={cn("w-full border-collapse text-sm", className)} {...props}>
        {children}
      </table>
    </div>
  )
}

export function Thead({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead className={cn("bg-admin-muted/60 text-left text-admin-fg-muted", className)} {...props} />
  )
}

type ThProps = React.ComponentProps<"th"> & {
  /** Hug content (actions / reorder). */
  actions?: boolean
}

export function Th({ className, actions, children, style, ...props }: ThProps) {
  return (
    <th
      className={cn(
        "relative border border-admin-border px-3 py-2 text-xs font-medium uppercase tracking-wide",
        actions && "w-0 whitespace-nowrap px-1.5",
        className,
      )}
      style={actions ? { ...style, width: "1%", whiteSpace: "nowrap" } : style}
      {...props}
    >
      {children}
    </th>
  )
}

export function Tbody({ className, ...props }: React.ComponentProps<"tbody">) {
  return <tbody className={cn(className)} {...props} />
}

type TdProps = React.ComponentProps<"td"> & {
  /** Hug content (action buttons). */
  actions?: boolean
}

export function Td({ className, actions, style, ...props }: TdProps) {
  return (
    <td
      className={cn(
        "border border-admin-border px-3 py-2 text-admin-fg",
        actions && "w-0 whitespace-nowrap px-1.5",
        className,
      )}
      style={actions ? { ...style, width: "1%", whiteSpace: "nowrap" } : style}
      {...props}
    />
  )
}

export function Tr({ className, ...props }: React.ComponentProps<"tr">) {
  return <tr className={cn("transition-colors hover:bg-admin-muted/40", className)} {...props} />
}

/* ---------- Icon button (actions) ---------- */
type IconTone = "default" | "danger"
export function IconButton({
  tone = "default",
  className,
  ...props
}: React.ComponentProps<"button"> & { tone?: IconTone }) {
  return (
    <button
      className={cn(
        "grid h-8 w-8 place-items-center rounded-md border border-transparent transition-colors",
        tone === "danger"
          ? "text-admin-fg-subtle hover:border-admin-danger/40 hover:bg-admin-danger/10 hover:text-admin-danger"
          : "text-admin-fg-muted hover:border-admin-border hover:bg-admin-muted hover:text-admin-fg",
        className,
      )}
      {...props}
    />
  )
}

export function IconLink({ className, onClick, href, target, ...props }: React.ComponentProps<typeof Link>) {
  const { confirmDiscard, runWithNavigationBypass } = useAdminDirty()
  const router = useRouter()
  const isHashOnly = typeof href === "string" && href.startsWith("#")
  const isBlank = target === "_blank"
  return (
    <Link
      href={href}
      target={target}
      onClick={async (e) => {
        if (onClick) onClick(e)
        if (e.defaultPrevented || isHashOnly || isBlank) return
        e.preventDefault()
        const discard = await confirmDiscard()
        if (!discard) return
        const hrefStr = String(href)
        await runWithNavigationBypass(async () => {
          if (target) window.open(hrefStr, target)
          else router.push(hrefStr)
        })
      }}
      className={cn(
        "grid h-8 w-8 place-items-center rounded-md border border-transparent text-admin-fg-muted transition-colors hover:border-admin-border hover:bg-admin-muted hover:text-admin-fg",
        className,
      )}
      {...props}
    />
  )
}

/* ---------- FormSection (collapsible card with anchor id) ---------- */
export function FormSection({
  id,
  title,
  defaultOpen = true,
  collapsible = true,
  children,
  className,
}: {
  id: string
  title: string
  defaultOpen?: boolean
  collapsible?: boolean
  children: React.ReactNode
  className?: string
}) {
  const [open, setOpen] = useState(defaultOpen)
  if (!collapsible) {
    return (
      <div id={id} className={cn("rounded-lg border border-admin-border bg-white", className)}>
        <div className="border-b border-admin-border px-5 py-3">
          <span className="text-sm font-semibold text-admin-fg">{title}</span>
        </div>
        <div className="p-5">{children}</div>
      </div>
    )
  }

  return (
    <div id={id} className={cn("rounded-lg border border-admin-border bg-white", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between border-b border-admin-border px-5 py-4 text-left"
        aria-expanded={open}
      >
        <span className="text-sm font-semibold text-admin-fg">{title}</span>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-admin-fg-subtle transition-transform duration-150", open && "rotate-180")}
        />
      </button>
      {/* Держим содержимое смонтированным (display:none), чтобы поля формы не терялись при submit */}
      <div className={cn("p-5", !open && "hidden")}>{children}</div>
    </div>
  )
}

/* ---------- FloatingSave ---------- */
export function FloatingSave({ pending, label = "Сохранить" }: { pending?: boolean; label?: string }) {
  return (
    <div className="fixed bottom-5 right-5 z-40">
      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-lg border border-admin-fg bg-admin-fg px-5 py-2.5 text-sm font-medium text-white shadow-lg transition-colors hover:bg-admin-fg/90 disabled:pointer-events-none disabled:opacity-50"
      >
        <Save className="h-4 w-4" />
        {pending ? "Сохранение…" : label}
      </button>
    </div>
  )
}

/* ---------- FormAnchorNav (sticky sidebar for long forms) ---------- */
export function FormAnchorNav({ sections }: { sections: { id: string; label: string }[] }) {
  return (
    <nav className="sticky top-4 hidden w-44 shrink-0 xl:block" aria-label="Навигация по форме">
      <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-admin-fg-subtle">
        Разделы
      </p>
      <ul className="space-y-0.5">
        {sections.map((s) => (
          <li key={s.id}>
            <a
              href={`#${s.id}`}
              className="block rounded-md px-2.5 py-1.5 text-sm text-admin-fg-muted transition-colors hover:bg-admin-muted hover:text-admin-fg"
            >
              {s.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}

/* ---------- Empty state ---------- */
export function EmptyState({ title, description, children }: { title: string; description?: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-admin-border bg-admin-muted/40 px-6 py-12 text-center">
      <p className="text-sm font-medium text-admin-fg">{title}</p>
      {description ? <p className="mt-1 text-sm text-admin-fg-muted">{description}</p> : null}
      {children}
    </div>
  )
}
