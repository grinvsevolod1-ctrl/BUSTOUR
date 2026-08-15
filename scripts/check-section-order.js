const assert = require("node:assert/strict")

function resolveInitialOrder(savedOrder, defaultOrder, baseShortKeys, multipliableBases, optionalKeys = []) {
  const validKeys = new Set([...baseShortKeys, ...optionalKeys])
  const isValid = (key) =>
    validKeys.has(key) ||
    multipliableBases.some((base) => key !== base && new RegExp(`^${base}\\d+$`).test(key))

  if (savedOrder === undefined || savedOrder === "") {
    return [
      ...defaultOrder.filter(isValid),
      ...baseShortKeys.filter((key) => !defaultOrder.includes(key) && !optionalKeys.includes(key)),
    ]
  }

  const parsed =
    typeof savedOrder === "string"
      ? (() => {
          try {
            const value = JSON.parse(savedOrder)
            return Array.isArray(value) ? value.filter((key) => typeof key === "string") : []
          } catch {
            return []
          }
        })()
      : savedOrder

  const kept = parsed.filter(isValid)
  if (!kept.length) {
    return [
      ...defaultOrder.filter(isValid),
      ...baseShortKeys.filter((key) => !defaultOrder.includes(key) && !optionalKeys.includes(key)),
    ]
  }
  return kept
}

const bases = ["seo", "faq", "callus"]
const multipliable = ["seo"]

assert.deepEqual(
  resolveInitialOrder(undefined, ["seo", "faq"], bases, multipliable),
  ["seo", "faq", "callus"],
)
assert.deepEqual(
  resolveInitialOrder('["seo","callus"]', ["seo", "faq", "callus"], bases, multipliable),
  ["seo", "callus"],
)
assert.deepEqual(
  resolveInitialOrder('["seo2","faq"]', ["seo", "faq"], bases, multipliable),
  ["seo2", "faq"],
)
assert.deepEqual(
  resolveInitialOrder('["seo","stale","resorts9"]', ["seo"], bases, multipliable),
  ["seo"],
)
assert.deepEqual(
  resolveInitialOrder(undefined, ["seo"], [...bases, "leadform"], multipliable, ["leadform"]),
  ["seo", "faq", "callus"],
)
assert.deepEqual(
  resolveInitialOrder('["seo","leadform"]', ["seo"], [...bases, "leadform"], multipliable, ["leadform"]),
  ["seo", "leadform"],
)
assert.deepEqual(
  resolveInitialOrder("[]", ["seo", "faq", "callus"], bases, multipliable),
  ["seo", "faq", "callus"],
)
assert.deepEqual(
  resolveInitialOrder("", ["seo", "faq", "callus"], bases, multipliable),
  ["seo", "faq", "callus"],
)
console.log("section order self-check: ok")
