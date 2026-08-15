/** Native title tooltip for admin «Виджет» (Tourvisor search editor). */
export const TOURVISOR_WIDGET_HINT =
  "Редактор поискового виджета Tourvisor для этой страницы: фильтры и выдача туров на сайте. Открывается во внешней вкладке."

export const TOURVISOR_INIT_SRC = "https://tourvisor.ru/module/init.js"

/** Marks scripts we inject; never touch next/script SearchForm nodes. */
export const TOURVISOR_INJECT_ATTR = "data-tv-inject"

/** Remove only our injected init scripts — not home SearchForm next/script. */
export function removeInjectedTourvisorScripts(): void {
  document.querySelectorAll(`script[${TOURVISOR_INJECT_ATTR}]`).forEach((s) => s.remove())
}

/** Cache-bust inject so Tourvisor re-scans DOM hosts. */
export function injectTourvisorInit(onDone: () => void): HTMLScriptElement {
  removeInjectedTourvisorScripts()
  const script = document.createElement("script")
  script.src = `${TOURVISOR_INIT_SRC}?_=${Date.now()}`
  script.async = true
  script.setAttribute(TOURVISOR_INJECT_ATTR, "1")
  script.onload = onDone
  script.onerror = onDone
  document.body.appendChild(script)
  return script
}

/** Clear widget host children Tourvisor left behind. */
export function teardownTourvisorHost(host: HTMLElement | null): void {
  host?.replaceChildren()
}
