/**
 * Selfcheck: lib/rate-limit — брутфорс-защита логина и антиспам форм.
 * Запуск: npx tsx --conditions=react-server scripts/rate-limit.selfcheck.ts
 * (react-server условие нужно из-за import "server-only" в модуле)
 */
import assert from "node:assert/strict"
import { consumeRateLimit, resetRateLimit, clientIpFromHeaders } from "../lib/rate-limit"

// --- consumeRateLimit: базовое окно ---
{
  const bucket = `t-basic-${Date.now()}`
  for (let i = 1; i <= 3; i++) {
    const r = consumeRateLimit(bucket, "1.2.3.4", 3, 60_000)
    assert.equal(r.ok, true, `attempt ${i} must pass`)
  }
  const r4 = consumeRateLimit(bucket, "1.2.3.4", 3, 60_000)
  assert.equal(r4.ok, false, "attempt 4 must be blocked")
  assert.ok(r4.retryAfterSec >= 1 && r4.retryAfterSec <= 60, "retryAfter within window")
}

// --- независимость ключей ---
{
  const bucket = `t-keys-${Date.now()}`
  consumeRateLimit(bucket, "10.0.0.1", 1, 60_000)
  const blocked = consumeRateLimit(bucket, "10.0.0.1", 1, 60_000)
  const other = consumeRateLimit(bucket, "10.0.0.2", 1, 60_000)
  assert.equal(blocked.ok, false, "same key blocked")
  assert.equal(other.ok, true, "different key unaffected")
}

// --- resetRateLimit: сброс после успешного входа ---
{
  const bucket = `t-reset-${Date.now()}`
  consumeRateLimit(bucket, "ip", 1, 60_000)
  assert.equal(consumeRateLimit(bucket, "ip", 1, 60_000).ok, false, "blocked before reset")
  resetRateLimit(bucket, "ip")
  assert.equal(consumeRateLimit(bucket, "ip", 1, 60_000).ok, true, "allowed after reset")
}

// --- clientIpFromHeaders ---
{
  assert.equal(clientIpFromHeaders(new Headers({ "x-real-ip": "9.9.9.9" })), "9.9.9.9", "x-real-ip wins")
  assert.equal(
    clientIpFromHeaders(new Headers({ "x-forwarded-for": "8.8.8.8, 1.1.1.1" })),
    "8.8.8.8",
    "first XFF hop",
  )
  assert.equal(clientIpFromHeaders(new Headers()), "unknown", "no headers → unknown")
}

// --- истечение окна (async, tsx компилирует в CJS — без top-level await) ---
async function main() {
  const bucket = `t-window-${Date.now()}`
  consumeRateLimit(bucket, "ip", 1, 1) // окно 1мс
  await new Promise((r) => setTimeout(r, 10))
  assert.equal(consumeRateLimit(bucket, "ip", 1, 1).ok, true, "window expired → allowed")
  console.log("rate-limit.selfcheck: ok")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
