// DEPLOY precondition: НИГДЕ в активных config/env нет turso.tech (запрещено пользователем категорически).
import { readFileSync } from "node:fs"
import assert from "node:assert/strict"

function noTurso(label, content) {
  const matches = content.match(/turso\.tech|libsql:\/\/[^\s"']+\.turso\.io/gi)
  assert.ok(!matches, `FAIL deploy-turso-ban: ${label} содержит запрещённые Turso ссылки: ${matches}`)
}

// .env.vps = реально копируется на VPS как .env (deploy.ps1)
noTurso(".env.vps (uploaded to Docker VPS as .env)", readFileSync(".env.vps", "utf8"))
// .env.local = локальный dev, не должен содержать Turso
noTurso(".env.local (local dev overrides)", readFileSync(".env.local", "utf8"))
// .env.example = шаблон для новых пользователей
try { noTurso(".env.example (template)", readFileSync(".env.example", "utf8")) } catch { /* template допускает комментарии с Turso как пример альтернативы */ }
// next.config.mjs CSP (deploy build time config — bake into client headers)
const nextCfg = readFileSync("next.config.mjs", "utf8")
noTurso("next.config.mjs CSP headers (baked build-time)", nextCfg)
assert.ok(!/turso\.tech/i.test(nextCfg), "FAIL: next.config.mjs содержит turso.tech (даже в комментарии не допустимый в CSP)")

// docker-compose.yml: комментарии про Turso как пример override разрешены — но только как комментарий с указанием «optional». Проверяем что нет непрокомментированного DATABASE_URL Turso.
const compose = readFileSync("docker-compose.yml", "utf8")
assert.ok(!/(?<!#.*)DATABASE_URL=libsql:\/\//.test(compose),
  "FAIL docker-compose.yml: НЕзакомментированный DATABASE_URL libsql:// (Turso-style) найден — разрешён только commented-out как optional override")

console.log("PASS deploy-turso-ban: Во всех активных config/env нет ни одной ссылки на turso.tech / Turso libsql URL.")
