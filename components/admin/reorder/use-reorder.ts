"use client"

import { useCallback, useState } from "react"

export function moveId(orderedIds: number[], draggedId: number, targetId: number) {
  if (draggedId === targetId) return orderedIds
  const from = orderedIds.indexOf(draggedId)
  const to = orderedIds.indexOf(targetId)
  if (from < 0 || to < 0) return orderedIds
  const next = [...orderedIds]
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  return next
}

/** Drag highlight state only — submit/pending lives in SortableTableBody / SortableList. */
export function useReorder({ id }: { id: number }) {
  const [draggingId, setDraggingId] = useState<number | null>(null)
  const [dropTargetId, setDropTargetId] = useState<number | null>(null)
  const reset = useCallback(() => {
    setDraggingId(null)
    setDropTargetId(null)
  }, [])
  return { id, draggingId, dropTargetId, setDraggingId, setDropTargetId, reset }
}
