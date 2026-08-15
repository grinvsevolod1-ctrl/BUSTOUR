/**
 * Checksum dedupe + HTTP fallback (no crypto.subtle).
 * Run: npx tsx scripts/media-dup-confirm.selfcheck.ts
 */
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { createHash } from "node:crypto"
import { isSha256Hex, sha256HexFromBlob } from "@/lib/media-checksum"

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")

async function hashWithoutSubtle(bytes: Uint8Array): Promise<string> {
  const subtleDesc = Object.getOwnPropertyDescriptor(globalThis.crypto, "subtle")
  Object.defineProperty(globalThis.crypto, "subtle", { value: undefined, configurable: true })
  const proc = globalThis.process
  // Force browser-like path (no node:crypto branch)
  // @ts-expect-error deliberate
  globalThis.process = undefined
  try {
    return await sha256HexFromBlob(new Blob([bytes]))
  } finally {
    globalThis.process = proc
    if (subtleDesc) Object.defineProperty(globalThis.crypto, "subtle", subtleDesc)
  }
}

async function main() {
  const bytes = new TextEncoder().encode("bustour-dup-check")
  const expected = createHash("sha256").update(bytes).digest("hex")
  assert.ok(isSha256Hex(expected))
  assert.ok(!isSha256Hex("short"))
  assert.equal(await sha256HexFromBlob(new Blob([bytes])), expected)

  for (const s of ["", "a", "bustour-dup-check", "x".repeat(2000)]) {
    const b = new TextEncoder().encode(s)
    const exp = createHash("sha256").update(b).digest("hex")
    assert.equal(await hashWithoutSubtle(b), exp, `js fallback for len=${s.length}`)
  }

  const uploader = fs.readFileSync(path.join(root, "components/admin/media-uploader.tsx"), "utf8")
  assert.ok(uploader.includes("by-checksum"), "pre-upload checksum lookup")
  assert.ok(uploader.includes("из медиатеки"), "toast when auto-reusing")
  assert.ok(!uploader.includes("askReuseDuplicate"), "no blocking dup confirm promise")

  assert.ok(fs.existsSync(path.join(root, "app/api/media/by-checksum/route.ts")))
  console.log("ok")
}

void main()
