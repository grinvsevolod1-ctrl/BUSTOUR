"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { UnsavedChangesDialog } from "@/components/admin/unsaved-changes-dialog"

export type AdminDirtyRegistration = {
  markDirty(): void
  markClean(): void
  unregister(): void
}

export type AdminDirtyContextValue = {
  dirtyCount: number
  hasDirtySources: boolean
  registerDirtySource(input: { id: string; label: string }): AdminDirtyRegistration
  confirmDiscard(): Promise<boolean>
  runWithNavigationBypass<T>(operation: () => T | Promise<T>): Promise<T>
}

type Source = { label: string; dirty: boolean; token: symbol }
const AdminDirtyContext = createContext<AdminDirtyContextValue | null>(null)

export function AdminDirtyProvider({ children }: { children: ReactNode }) {
  const sourcesRef = useRef(new Map<string, Source>())
  const bypassRef = useRef(false)
  const pendingResolver = useRef<((discard: boolean) => void) | null>(null)
  const pendingPromise = useRef<Promise<boolean> | null>(null)
  const [dirtyCount, setDirtyCount] = useState(0)
  const [dialogOpen, setDialogOpen] = useState(false)

  const syncDirtyCount = useCallback(() => {
    setDirtyCount(
      [...sourcesRef.current.values()].filter((source) => source.dirty).length,
    )
  }, [])

  const registerDirtySource = useCallback(
    ({ id, label }: { id: string; label: string }): AdminDirtyRegistration => {
      const token = Symbol(id)
      const current = sourcesRef.current.get(id)
      sourcesRef.current.set(id, { label, dirty: current?.dirty ?? false, token })
      syncDirtyCount()

      const update = (dirty: boolean) => {
        const source = sourcesRef.current.get(id)
        if (!source || source.token !== token || source.dirty === dirty) return
        source.dirty = dirty
        syncDirtyCount()
      }

      return {
        markDirty: () => update(true),
        markClean: () => update(false),
        unregister: () => {
          if (sourcesRef.current.get(id)?.token !== token) return
          sourcesRef.current.delete(id)
          syncDirtyCount()
        },
      }
    },
    [syncDirtyCount],
  )

  const settleDialog = useCallback((discard: boolean) => {
    const resolve = pendingResolver.current
    pendingResolver.current = null
    pendingPromise.current = null
    setDialogOpen(false)
    resolve?.(discard)
  }, [])

  const confirmDiscard = useCallback((): Promise<boolean> => {
    if (bypassRef.current) return Promise.resolve(true)
    if (![...sourcesRef.current.values()].some((source) => source.dirty)) {
      return Promise.resolve(true)
    }
    if (pendingPromise.current) return pendingPromise.current
    pendingPromise.current = new Promise<boolean>((resolve) => {
      pendingResolver.current = resolve
    })
    setDialogOpen(true)
    return pendingPromise.current
  }, [])

  const runWithNavigationBypass = useCallback(
    async <T,>(operation: () => T | Promise<T>): Promise<T> => {
      bypassRef.current = true
      try {
        return await operation()
      } finally {
        bypassRef.current = false
      }
    },
    [],
  )

  // If every source became clean (or unregistered) while the dialog is open,
  // there is nothing to discard — resolve as "safe to leave" automatically
  // instead of showing "unsaved data in 0 areas".
  useEffect(() => {
    if (dialogOpen && dirtyCount === 0) settleDialog(true)
  }, [dialogOpen, dirtyCount, settleDialog])

  useEffect(() => {
    if (dirtyCount === 0) return
    const beforeunload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ""
    }
    window.addEventListener("beforeunload", beforeunload)
    return () => window.removeEventListener("beforeunload", beforeunload)
  }, [dirtyCount])

  const value = useMemo<AdminDirtyContextValue>(
    () => ({
      dirtyCount,
      hasDirtySources: dirtyCount > 0,
      registerDirtySource,
      confirmDiscard,
      runWithNavigationBypass,
    }),
    [dirtyCount, registerDirtySource, confirmDiscard, runWithNavigationBypass],
  )

  return (
    <AdminDirtyContext.Provider value={value}>
      {children}
      <UnsavedChangesDialog
        open={dialogOpen}
        dirtyCount={dirtyCount}
        onStay={() => settleDialog(false)}
        onDiscard={() => settleDialog(true)}
      />
    </AdminDirtyContext.Provider>
  )
}

export function useAdminDirty(): AdminDirtyContextValue {
  const value = useContext(AdminDirtyContext)
  if (!value) {
    throw new Error("useAdminDirty must be used within AdminDirtyProvider")
  }
  return value
}
