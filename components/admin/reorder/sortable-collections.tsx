"use client"

import { Children, cloneElement, isValidElement, useCallback, useTransition, type ReactNode } from "react"
import { cn } from "@/lib/utils"
import { moveId, useReorder } from "@/components/admin/reorder/use-reorder"

type ReorderAction = (formData: FormData) => void | Promise<void>
type SortableItem = { id: number; label: string }

let activeDraggedId: number | null = null

function SortableElement({ item, element, orderedIds, isPending, onReorder }: {
  item: SortableItem
  element: ReactNode
  orderedIds: number[]
  isPending: boolean
  onReorder: (nextOrder: number[]) => void
}) {
  if (!isValidElement<React.HTMLAttributes<HTMLElement>>(element)) return null
  const { draggingId, dropTargetId, setDraggingId, setDropTargetId, reset } = useReorder({
    id: item.id,
  })
  return cloneElement(element, {
    draggable: !isPending,
    "aria-busy": isPending || undefined,
    onDragStart: (event: React.DragEvent<HTMLElement>) => {
      event.dataTransfer.effectAllowed = "move"
      event.dataTransfer.setData("text/plain", String(item.id))
      activeDraggedId = item.id
      setDraggingId(item.id)
    },
    onDragOver: (event: React.DragEvent<HTMLElement>) => {
      const draggedId = Number(event.dataTransfer.getData("text/plain") || activeDraggedId || draggingId || 0)
      if (!draggedId || draggedId === item.id) return
      event.preventDefault()
      event.dataTransfer.dropEffect = "move"
      setDropTargetId(item.id)
    },
    onDragLeave: () => setDropTargetId((current) => current === item.id ? null : current),
    onDrop: (event: React.DragEvent<HTMLElement>) => {
      event.preventDefault()
      const draggedId = Number(event.dataTransfer.getData("text/plain") || activeDraggedId || draggingId || 0)
      activeDraggedId = null
      reset()
      const nextOrder = moveId(orderedIds, draggedId, item.id)
      if (nextOrder !== orderedIds) onReorder(nextOrder)
    },
    onDragEnd: () => {
      activeDraggedId = null
      reset()
    },
    className: cn(
      element.props.className,
      "group/drag-reorder",
      draggingId === item.id && "opacity-50",
      dropTargetId === item.id && "bg-admin-muted/70 ring-1 ring-inset ring-cyan-accent/40",
    ),
  })
}

export function SortableTableBody({ items, action, children }: { items: SortableItem[]; action: ReorderAction; children: ReactNode }) {
  const orderedIds = items.map((item) => item.id)
  const elements = Children.toArray(children)
  const [isPending, startTransition] = useTransition()
  const onReorder = useCallback((nextOrder: number[]) => {
    const formData = new FormData()
    formData.set("orderedIds", JSON.stringify(nextOrder))
    startTransition(() => void action(formData))
  }, [action])
  return (
    <tbody
      className={cn(isPending && "pointer-events-none opacity-60")}
      aria-busy={isPending || undefined}
    >
      {isPending ? (
        <tr>
          <td colSpan={20} className="border border-admin-border bg-slate-50 px-3 py-2 text-center text-sm text-admin-fg-muted">
            Сохранение порядка…
          </td>
        </tr>
      ) : null}
      {items.map((item, index) => (
        <SortableElement
          key={item.id}
          item={item}
          element={elements[index]}
          orderedIds={orderedIds}
          isPending={isPending}
          onReorder={onReorder}
        />
      ))}
    </tbody>
  )
}

export function SortableList({ items, action, collection, className, children }: {
  items: SortableItem[]
  action: ReorderAction
  collection?: string
  className?: string
  children: ReactNode
}) {
  const orderedIds = items.map((item) => item.id)
  const elements = Children.toArray(children)
  const [isPending, startTransition] = useTransition()
  const onReorder = useCallback((nextOrder: number[]) => {
    const formData = new FormData()
    formData.set("orderedIds", JSON.stringify(nextOrder))
    if (collection) formData.set("collection", collection)
    startTransition(() => void action(formData))
  }, [action, collection])
  return (
    <ul className={cn(className, isPending && "pointer-events-none opacity-60")} aria-busy={isPending || undefined}>
      {isPending ? (
        <li className="rounded-md bg-slate-50 px-3 py-2 text-center text-sm text-admin-fg-muted">
          Сохранение порядка…
        </li>
      ) : null}
      {items.map((item, index) => (
        <SortableElement
          key={item.id}
          item={item}
          element={elements[index]}
          orderedIds={orderedIds}
          isPending={isPending}
          onReorder={onReorder}
        />
      ))}
    </ul>
  )
}
