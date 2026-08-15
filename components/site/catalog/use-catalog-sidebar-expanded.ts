"use client"

import { useCallback, useEffect, useState } from "react"

/** Survives sidebar remount on in-catalog client navigations (no shared layout). */
const expandedByCatalog = new Map<string, Record<string, boolean>>()

/**
 * Persist which sidebar country branches are open while the user stays in a catalog.
 * `seedOpen` keys (active URL country/city) are always merged open without collapsing others.
 */
export function useCatalogSidebarExpanded(catalogKey: string, seedOpen: readonly string[]) {
  const seedSig = seedOpen.filter(Boolean).join("\0")

  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const next = { ...(expandedByCatalog.get(catalogKey) ?? {}) }
    for (const key of seedOpen) {
      if (key) next[key] = true
    }
    expandedByCatalog.set(catalogKey, next)
    return next
  })

  useEffect(() => {
    if (!seedSig) return
    const keys = seedSig.split("\0").filter(Boolean)
    setExpanded((prev) => {
      let changed = false
      const next = { ...prev }
      for (const key of keys) {
        if (!next[key]) {
          next[key] = true
          changed = true
        }
      }
      if (!changed) return prev
      expandedByCatalog.set(catalogKey, next)
      return next
    })
  }, [catalogKey, seedSig])

  const toggleExpanded = useCallback(
    (key: string) => {
      setExpanded((prev) => {
        const next = { ...prev, [key]: !prev[key] }
        expandedByCatalog.set(catalogKey, next)
        return next
      })
    },
    [catalogKey],
  )

  return { expanded, toggleExpanded }
}

/** Test-only: clear in-memory expand state. */
export function resetCatalogSidebarExpandedForTests() {
  expandedByCatalog.clear()
}
