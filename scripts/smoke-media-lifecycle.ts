/**
 * HTTP smoke: login → encode WebP in browser → upload → GET 200 → DELETE → 404.
 *
 * Env:
 *   MEDIA_SMOKE_BASE_URL (default http://31.77.228.133:3000)
 *   ADMIN_USERNAME / ADMIN_PASSWORD (or .env.vps / E2E_*)
 *
 * Run: npx tsx scripts/smoke-media-lifecycle.ts
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

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    await page.goto(`${BASE}/admin/login`, { waitUntil: "domcontentloaded", timeout: 60_000 })
    await page.fill("#username", USER)
    await page.fill("#password", PASS)
    await page.getByRole("button", { name: /Войти/i }).click()
    await page.waitForURL(/\/admin(?!\/login)/, { timeout: 60_000 })

    // Encode 2×2 PNG → WebP in the page (same path as MediaUploader / Canvas).
    const webpBuffer = Buffer.from(
      await page.evaluate(async () => {
        const canvas = document.createElement("canvas")
        canvas.width = 2
        canvas.height = 2
        const ctx = canvas.getContext("2d")!
        ctx.fillStyle = "#336699"
        ctx.fillRect(0, 0, 2, 2)
        const blob = await new Promise<Blob | null>((resolve) => {
          canvas.toBlob((b) => resolve(b), "image/webp", 0.82)
        })
        if (!blob) throw new Error("canvas.toBlob(image/webp) returned null")
        const ab = await blob.arrayBuffer()
        return Array.from(new Uint8Array(ab))
      }),
    )
    assert.ok(webpBuffer.length > 20, "webp payload too small")
    // RIFF....WEBP
    assert.equal(webpBuffer.toString("ascii", 0, 4), "RIFF")
    assert.equal(webpBuffer.toString("ascii", 8, 12), "WEBP")

    const req = context.request
    const upload = await req.post(`${BASE}/api/media/upload`, {
      multipart: {
        file: {
          name: `smoke-${Date.now()}.webp`,
          mimeType: "image/webp",
          buffer: webpBuffer,
        },
      },
    })
    const uploadBody = await upload.json().catch(() => ({}))
    assert.equal(upload.status(), 200, `upload HTTP ${upload.status()} ${JSON.stringify(uploadBody)}`)
    assert.ok(uploadBody?.id && uploadBody?.url, `upload payload: ${JSON.stringify(uploadBody)}`)

    const urlPath: string = uploadBody.url
    assert.ok(/\.webp($|\?)/i.test(urlPath), `expected .webp url, got ${urlPath}`)

    const abs = urlPath.startsWith("http") ? urlPath : `${BASE}${urlPath}`
    const getOk = await req.get(abs)
    assert.equal(getOk.status(), 200, `media GET ${abs} → ${getOk.status()}`)
    const ctype = getOk.headers()["content-type"] || ""
    assert.ok(/image\/webp/i.test(ctype), `content-type image/webp, got ${ctype}`)
    const bytes = Buffer.from(await getOk.body())
    assert.equal(bytes.toString("ascii", 0, 4), "RIFF")
    assert.equal(bytes.toString("ascii", 8, 12), "WEBP")

    const del = await req.delete(`${BASE}/api/media/${uploadBody.id}`)
    assert.equal(del.status(), 200, `delete HTTP ${del.status()}`)

    let goneStatus = 0
    for (let attempt = 0; attempt < 5; attempt++) {
      const getGone = await req.get(abs)
      goneStatus = getGone.status()
      if (goneStatus === 404) break
      await new Promise((r) => setTimeout(r, 200 * (attempt + 1)))
    }
    assert.equal(goneStatus, 404, `after delete expected 404, got ${goneStatus}`)

    console.log(JSON.stringify({ ok: true, base: BASE, url: urlPath, webp: true }))
    console.log("ok")
  } finally {
    await browser.close()
  }
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
