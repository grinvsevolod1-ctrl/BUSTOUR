"use client"

import Link from "next/link"
import { ChevronUp, ChevronDown, Pencil, Trash2, Eye, EyeOff } from "lucide-react"
import type { ContentBlock } from "@/lib/types"
import type { CollectionMeta } from "@/lib/admin-config"
import { deleteBlockAction, toggleBlockAction, moveBlockAction } from "@/app/admin/cms-actions"

export function BlockRow({
  block,
  meta,
  isFirst,
  isLast,
  dragHandle,
  className,
  ...props
}: {
  block: ContentBlock
  meta: CollectionMeta
  isFirst: boolean
  isLast: boolean
  dragHandle?: React.ReactNode
} & React.ComponentProps<"li">) {
  const preview = block.title || block.body || block.subtitle || "(без названия)"
  const secondary = block.title ? block.body || block.subtitle : ""

  return (
    <li className={`flex items-center gap-3 px-4 py-3 ${className ?? ""}`} {...props}>
      {meta.reorderable ? dragHandle : null}
      {meta.reorderable ? (
        <div className="flex flex-col">
          <form action={moveBlockAction}>
            <input type="hidden" name="id" value={block.id} />
            <input type="hidden" name="collection" value={meta.key} />
            <input type="hidden" name="direction" value="up" />
            <button
              type="submit"
              disabled={isFirst}
              aria-label="Выше"
              className="grid h-5 w-6 place-items-center rounded text-admin-fg-subtle transition-colors hover:bg-admin-muted hover:text-admin-fg disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <ChevronUp className="h-4 w-4" />
            </button>
          </form>
          <form action={moveBlockAction}>
            <input type="hidden" name="id" value={block.id} />
            <input type="hidden" name="collection" value={meta.key} />
            <input type="hidden" name="direction" value="down" />
            <button
              type="submit"
              disabled={isLast}
              aria-label="Ниже"
              className="grid h-5 w-6 place-items-center rounded text-admin-fg-subtle transition-colors hover:bg-admin-muted hover:text-admin-fg disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </form>
        </div>
      ) : null}

      <div className="min-w-0 flex-1">
        <p className={`truncate text-sm font-medium ${block.visible ? "text-admin-fg" : "text-admin-fg-subtle"}`}>
          {preview}
        </p>
        {secondary ? <p className="truncate text-xs text-admin-fg-muted">{secondary}</p> : null}
      </div>

      {!block.visible ? (
        <span className="hidden shrink-0 rounded-full border border-admin-border bg-admin-muted px-2 py-0.5 text-xs text-admin-fg-muted sm:inline">
          Скрыто
        </span>
      ) : null}

      <div className="flex shrink-0 items-center gap-1">
        <form action={toggleBlockAction}>
          <input type="hidden" name="id" value={block.id} />
          <input type="hidden" name="collection" value={meta.key} />
          <input type="hidden" name="visible" value={block.visible ? "0" : "1"} />
          <button
            type="submit"
            aria-label={block.visible ? "Скрыть" : "Показать"}
            title={block.visible ? "Скрыть" : "Показать"}
            className="grid h-8 w-8 place-items-center rounded-md text-admin-fg-muted transition-colors hover:bg-admin-muted hover:text-admin-fg"
          >
            {block.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </button>
        </form>

        <Link
          href={`/admin/content/${meta.key}/${block.id}`}
          aria-label="Редактировать"
          title="Редактировать"
          className="grid h-8 w-8 place-items-center rounded-md text-admin-fg-muted transition-colors hover:bg-admin-muted hover:text-admin-fg"
        >
          <Pencil className="h-4 w-4" />
        </Link>

        <form
          action={deleteBlockAction}
          onSubmit={(e) => {
            if (!confirm("Удалить этот элемент?")) e.preventDefault()
          }}
        >
          <input type="hidden" name="id" value={block.id} />
          <input type="hidden" name="collection" value={meta.key} />
          <button
            type="submit"
            aria-label="Удалить"
            title="Удалить"
            className="grid h-8 w-8 place-items-center rounded-md text-admin-fg-muted transition-colors hover:bg-admin-danger/10 hover:text-admin-danger"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </form>
      </div>
    </li>
  )
}
