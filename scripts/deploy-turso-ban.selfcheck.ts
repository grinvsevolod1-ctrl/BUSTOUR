// DEPLOY precondition: НИГДЕ в активных config/env нет turso.tech (запрещено пользователем категорически).
import { readFileSync } from "node:fs"
import assert from "node:assert/strict"

function noTurso(label: string, content: string) {
  const matches = content.match(/turso\.tech|libsql:\/\/[^\s"']+\.turso\.io/gi)
  assert.ok(!matches, `FAIL deploy-turso-ban: ${label} содержит запрещённые Turso ссылки: ${matches}`)
}

function tryRead(file: string): string | null {
  try {
    return readFileSync(file, "utf8")
  } catch {
    return null
  }
}

// Активные env-файлы (pm2 читает .env + .env.local через ecosystem.config.cjs)
for (const file of [".env", ".env.local", ".env.example"] as const) {
  const content = tryRead(file)
  if (content !== null) noTurso(file, content)
}

// next.config.mjs CSP (build-time, попадает в заголовки клиента)
const nextCfg = readFileSync("next.config.mjs", "utf8")
noTurso("next.config.mjs CSP headers (baked build-time)", nextCfg)
assert.ok(!/turso\.tech/i.test(nextCfg), "FAIL: next.config.mjs содержит turso.tech (даже в комментарии недопустимо в CSP)")

// pm2 ecosystem — единственный prod-конфиг запуска после ухода с Docker
const ecosystem = tryRead("ecosystem.config.cjs")
if (ecosystem !== null) noTurso("ecosystem.config.cjs (pm2 runtime config)", ecosystem)

console.log("PASS deploy-turso-ban: Во всех активных config/env нет ни одной ссылки на turso.tech / Turso libsql URL.")
