/**
 * Selfcheck: lib/password — хеширование и проверка паролей (async scrypt).
 * Запуск: npx tsx scripts/password.selfcheck.ts
 */
import assert from "node:assert/strict"
import { hashPassword, verifyPassword } from "../lib/password"

async function main() {
  // --- roundtrip ---
  {
    const hash = hashPassword("correct horse battery staple")
    assert.match(hash, /^[0-9a-f]{32}:[0-9a-f]{128}$/, "format <saltHex(16b)>:<hashHex(64b)>")
    assert.equal(await verifyPassword("correct horse battery staple", hash), true, "correct password verifies")
    assert.equal(await verifyPassword("wrong password", hash), false, "wrong password rejected")
  }

  // --- соль уникальна: одинаковые пароли → разные хеши ---
  {
    const a = hashPassword("same")
    const b = hashPassword("same")
    assert.notEqual(a, b, "unique salt per hash")
    assert.equal(await verifyPassword("same", a), true)
    assert.equal(await verifyPassword("same", b), true)
  }

  // --- битые/злонамеренные stored-значения не бросают исключений ---
  {
    for (const bad of ["", "no-colon", ":", "xx:yy", "deadbeef:", ":deadbeef"]) {
      assert.equal(await verifyPassword("anything", bad), false, `malformed "${bad}" → false`)
    }
  }

  // --- юникод-пароли ---
  {
    const hash = hashPassword("пароль-с-кириллицей-и-🔒")
    assert.equal(await verifyPassword("пароль-с-кириллицей-и-🔒", hash), true, "unicode roundtrip")
  }

  console.log("password.selfcheck: ok")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
