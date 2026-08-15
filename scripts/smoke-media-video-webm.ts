/**
 * HTTP smoke (DEV): login → upload tiny MP4 → expect WebM (ffmpeg on server).
 *
 * Env: MEDIA_SMOKE_BASE_URL (default http://31.77.228.133:3000), ADMIN_* / .env.vps
 * Run: npx tsx scripts/smoke-media-video-webm.ts
 */
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { chromium } from "@playwright/test"

function loadDotEnv(file: string) {
  if (!fs.existsSync(file)) return
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const t = line.trim()
    if (!t || t.startsWith("#")) continue
    const i = t.indexOf("=")
    if (i <= 0) continue
    const key = t.slice(0, i).trim()
    const val = t.slice(i + 1).trim()
    if (key && process.env[key] === undefined) process.env[key] = val
  }
}

loadDotEnv(path.join(process.cwd(), ".env.vps"))
loadDotEnv(path.join(process.cwd(), ".env.local"))
loadDotEnv(path.join(process.cwd(), ".env"))

const BASE = (process.env.MEDIA_SMOKE_BASE_URL || process.env.PLAYWRIGHT_BASE_URL || "http://31.77.228.133:3000").replace(
  /\/$/,
  "",
)
const USER =
  process.env.MEDIA_SMOKE_USER ||
  process.env.ADMIN_USERNAME ||
  process.env.E2E_ADMIN_USERNAME ||
  "admin"
const PASS =
  process.env.MEDIA_SMOKE_PASS ||
  process.env.ADMIN_PASSWORD ||
  process.env.E2E_ADMIN_PASSWORD ||
  ""

async function main() {
  assert.ok(PASS, "Set ADMIN_PASSWORD / MEDIA_SMOKE_PASS (or .env.vps)")

  const mp4Path = path.join(process.cwd(), "tmp", "dev-smoke.mp4")
  assert.ok(fs.existsSync(mp4Path), `missing ${mp4Path} — generate with ffmpeg first`)
  const mp4 = fs.readFileSync(mp4Path)
  assert.ok(mp4.length > 100, "mp4 too small")

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    await page.goto(`${BASE}/admin/login`, { waitUntil: "domcontentloaded", timeout: 60_000 })
    await page.fill("#username", USER)
    await page.fill("#password", PASS)
    await page.getByRole("button", { name: /Войти/i }).click()
    await page.waitForURL(/\/admin(?!\/login)/, { timeout: 60_000 })

    const req = context.request
    const upload = await req.post(`${BASE}/api/media/upload`, {
      multipart: {
        file: {
          name: `smoke-video-${Date.now()}.mp4`,
          mimeType: "video/mp4",
          buffer: mp4,
        },
      },
      timeout: 180_000,
    })
    const uploadBody = await upload.json().catch(() => ({}))
    assert.equal(upload.status(), 200, `upload HTTP ${upload.status()} ${JSON.stringify(uploadBody)}`)
    assert.ok(uploadBody?.id && uploadBody?.url, `upload payload: ${JSON.stringify(uploadBody)}`)

    const urlPath: string = uploadBody.url
    const mime: string = uploadBody.mimeType || uploadBody.contentType || ""
    assert.ok(/\.webm($|\?)/i.test(urlPath), `expected .webm url (ffmpeg convert), got ${urlPath}`)
    assert.ok(/video\/webm/i.test(mime) || !mime, `expected video/webm mime, got ${mime}`)

    const abs = urlPath.startsWith("http") ? urlPath : `${BASE}${urlPath}`
    const getOk = await req.get(abs)
    assert.equal(getOk.status(), 200, `media GET ${abs} → ${getOk.status()}`)
    const ctype = getOk.headers()["content-type"] || ""
    assert.ok(/video\/webm|application\/octet-stream/i.test(ctype), `content-type webm, got ${ctype}`)
    const bytes = Buffer.from(await getOk.body())
    // EBML header 0x1A45DFA3
    assert.equal(bytes[0], 0x1a, "webm EBML byte0")
    assert.equal(bytes[1], 0x45, "webm EBML byte1")

    const del = await req.delete(`${BASE}/api/media/${uploadBody.id}`)
    assert.equal(del.status(), 200, `delete HTTP ${del.status()}`)

    console.log(JSON.stringify({ ok: true, base: BASE, url: urlPath, mime, webm: true, bytes: bytes.length }))
    console.log("ok")
  } finally {
    await browser.close()
  }
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
