/** Prefer auto when user asks to reduce motion; otherwise smooth. */
export function scrollBehavior(): ScrollBehavior {
  if (typeof window === "undefined") return "smooth"
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"
}

/**
 * Scroll an element by id into view (sticky-header friendly via CSS scroll-mt on target).
 * Returns the element if found.
 */
export function scrollToId(
  id: string,
  options?: { behavior?: ScrollBehavior; block?: ScrollLogicalPosition },
): HTMLElement | null {
  if (typeof document === "undefined") return null
  const el = document.getElementById(id)
  if (!el) return null
  el.scrollIntoView({
    behavior: options?.behavior ?? scrollBehavior(),
    block: options?.block ?? "start",
  })
  return el
}
