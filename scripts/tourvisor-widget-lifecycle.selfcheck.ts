/**
 * #35/#38: Tourvisor inject cleanup must not nuke SearchForm next/script;
 * Avia must re-init when countryId/cityId change.
 * Run: npx tsx scripts/tourvisor-widget-lifecycle.selfcheck.ts
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import {
  TOURVISOR_INJECT_ATTR,
  TOURVISOR_INIT_SRC,
  removeInjectedTourvisorScripts,
  teardownTourvisorHost,
} from "../lib/tourvisor-widget"

const root = process.cwd()
const read = (rel: string) => readFileSync(join(root, rel), "utf8")

const lib = read("lib/tourvisor-widget.ts")
assert.ok(lib.includes(`"${TOURVISOR_INJECT_ATTR}"`) || lib.includes(`'${TOURVISOR_INJECT_ATTR}'`), "inject attr constant")
assert.ok(lib.includes("removeInjectedTourvisorScripts"), "scoped remover")
assert.ok(lib.includes("TOURVISOR_INJECT_ATTR"), "remover uses inject attr")
assert.ok(!/querySelectorAll\(`script\[src\^=/.test(lib), "lib must not nuke all init.js by src")

const hot = read("components/site/hot-tours-widget.tsx")
const avia = read("components/site/avia-tour-search-widget.tsx")
const search = read("components/site/search-form.tsx")

for (const [label, src] of [
  ["hot", hot],
  ["avia", avia],
] as const) {
  assert.ok(src.includes("injectTourvisorInit"), `${label}: uses shared inject`)
  assert.ok(src.includes("teardownTourvisorHost"), `${label}: tears down host`)
  assert.ok(!src.includes("querySelectorAll"), `${label}: no blanket script querySelectorAll`)
  assert.ok(!/script\[src\^=/.test(src), `${label}: must not remove by src^=`)
}

assert.ok(search.includes(TOURVISOR_INIT_SRC) || search.includes("tourvisor.ru/module/init.js"), "SearchForm still loads init.js")
assert.ok(search.includes('from "next/script"') || search.includes("from 'next/script'"), "SearchForm imports next/script")
assert.ok(!search.includes(TOURVISOR_INJECT_ATTR), "SearchForm script is not marked as inject")

assert.match(avia, /\[countryId,\s*cityId\]/, "avia effect deps include countryId/cityId")
assert.ok(avia.includes("key={`${countryId ?? \"\"}-${cityId ?? \"\"}`}") || /key=\{`\$\{countryId/.test(avia), "avia host remounts via key")

// Minimal DOM mock: remover must keep unmarked scripts (SearchForm-like)
type FakeEl = { getAttribute: (n: string) => string | null; remove: () => void; _attrs: Record<string, string> }
const injected: FakeEl[] = []
const unmarked: FakeEl[] = []
;(globalThis as unknown as { document: { querySelectorAll: (sel: string) => FakeEl[] } }).document = {
  querySelectorAll(sel: string) {
    assert.ok(sel.includes(TOURVISOR_INJECT_ATTR), `selector must scope to ${TOURVISOR_INJECT_ATTR}, got ${sel}`)
    return injected
  },
}
const ours: FakeEl = {
  _attrs: { [TOURVISOR_INJECT_ATTR]: "1" },
  getAttribute(n) {
    return this._attrs[n] ?? null
  },
  remove() {
    const i = injected.indexOf(this)
    if (i >= 0) injected.splice(i, 1)
  },
}
const keep: FakeEl = {
  _attrs: {},
  getAttribute() {
    return null
  },
  remove() {
    assert.fail("must not remove unmarked SearchForm-like script")
  },
}
injected.push(ours)
unmarked.push(keep)
removeInjectedTourvisorScripts()
assert.equal(injected.length, 0, "inject-marked script removed")
assert.equal(unmarked.length, 1, "unmarked script list untouched")

const host = { children: ["x"], replaceChildren() { this.children = [] } }
teardownTourvisorHost(host as unknown as HTMLElement)
assert.deepEqual(host.children, [])

console.log("tourvisor-widget-lifecycle.selfcheck: ok")
