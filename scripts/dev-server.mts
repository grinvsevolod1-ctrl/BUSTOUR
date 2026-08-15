#!/usr/bin/env npx tsx
import { mkdirSync, statfsSync, existsSync, readdirSync, lstatSync } from "node:fs"
import path from "node:path"
import os from "node:os"
import { spawn, spawnSync } from "node:child_process"
import { getBustourDeployEnv } from "../lib/deploy-env"

/**
 * Dev server launcher.
 *
 * 1. Runs scripts/preflight.ts (env/tsc/static-selfcheck) BEFORE next dev.
 *    Any CRITICAL failures → script exits with preflight's non-zero exit code,
 *    so the developer sees the problem immediately instead of a broken runtime.
 *
 * 2. Then proceeds with the existing DB resolution logic
 *    (always local file for local dev; VPS staging can override via DATABASE_URL).
 */
const SKIP_PREFLIGHT =
  process.env.BUSTOUR_SKIP_PREFLIGHT === "1" ||
  process.argv.includes("--no-preflight")

function runPreflight(): void {
  if (SKIP_PREFLIGHT) {
    console.log("[dev-server] ⚠  preflight SKIPPED (BUSTOUR_SKIP_PREFLIGHT=1 or --no-preflight).")
    return
  }
  console.log("[dev-server] Running preflight (env / tsc / selfchecks)…")
  const isWin = process.platform === "win32"
  const npx = isWin ? "npx.cmd" : "npx"
  const preflight = path.join(process.cwd(), "scripts", "preflight.ts")
  const res = spawnSync(isWin ? `"${npx}"` : npx, ["tsx", preflight, "--dev"], {
    cwd: process.cwd(),
    encoding: "utf8",
    shell: isWin,
    stdio: "inherit",
    windowsVerbatimArguments: isWin,
  })
  const exit = res.status ?? (res.error ? 1 : 0)
  if (exit !== 0) {
    console.error("")
    console.error("[dev-server] ⛔ PREFLIGHT FAILED. dev-server ОСТАНОВЛЕН (next dev НЕ запущен).")
    console.error("[dev-server]    Исправь ошибки выше или запусти с BUSTOUR_SKIP_PREFLIGHT=1 только если понимаешь что делаешь.")
    process.exit(exit)
  }
  console.log("[dev-server] ✅ Preflight OK. Starting next dev…\n")
}
runPreflight()


/**
 * The DB layer (lib/db) is PostgreSQL-only. The old SQLite/Turso `file:` fallback
 * broke local dev with "[db] DATABASE_URL must be a PostgreSQL URL".
 * Now: always use DATABASE_URL from env and fail fast with a clear message.
 *
 * This launcher runs BEFORE `next dev`, so .env files are not loaded yet —
 * load them the same way Next.js does (@next/env respects precedence order).
 */
const { loadEnvConfig } = await import("@next/env")
loadEnvConfig(process.cwd(), true)

function resolveDevDatabaseUrl(): string {
  const envUrl = (process.env.DATABASE_URL || "").trim()
  if (!envUrl) {
    console.error("[dev-server] ⛔ DATABASE_URL не задан. Укажите PostgreSQL URL в .env, например:")
    console.error("[dev-server]    DATABASE_URL=postgresql://bastur:pass@localhost:5432/bastur")
    process.exit(1)
  }
  if (!/^postgres(ql)?:\/\//i.test(envUrl)) {
    console.error(`[dev-server] ⛔ DATABASE_URL должен быть PostgreSQL URL (postgresql://…). Сейчас: ${envUrl.slice(0, 24)}…`)
    process.exit(1)
  }
  return envUrl
}

process.env.DATABASE_URL = resolveDevDatabaseUrl()
// Legacy Turso token is irrelevant for PostgreSQL and must never leak into logs.
delete process.env.DATABASE_AUTH_TOKEN

const MIN_FREE_BYTES = 1024n * 1024n * 1024n
const BYTES_PER_GB = 1024n * 1024n * 1024n

function formatBytes(raw: bigint): string {
  const gb = Number(raw) / Number(BYTES_PER_GB)
  if (gb >= 1) return `${gb.toFixed(2)} GB`
  const mb = Number(raw) / (1024 * 1024)
  if (mb >= 1) return `${mb.toFixed(1)} MB`
  const kb = Number(raw) / 1024
  if (kb >= 1) return `${kb.toFixed(0)} KB`
  return `${Number(raw)} B`
}

function checkDiskSpace() {
  const cwd = process.cwd()
  try {
    const info = statfsSync(cwd, { bigint: true })
    const free = info.bavail * info.bsize
    const freeGB = Number(free) / Number(BYTES_PER_GB)

    if (free < MIN_FREE_BYTES) {
      const projectRoot = cwd
      const nextDir = path.join(projectRoot, ".next")
      const nodeCacheDir = path.join(projectRoot, "node_modules", ".cache")
      const tempDir = os.tmpdir()
      console.error("====================================================================")
      console.error("[dev-server] CRITICAL: Недостаточно свободного места на диске")
      console.error(`====================================================================`)
      console.error(`  Текущая директория проекта : ${projectRoot}`)
      console.error(`  Доступно свободного места   : ${formatBytes(free)} (${freeGB.toFixed(2)} GB)`)
      console.error(`  Требуется минимум          : ${formatBytes(MIN_FREE_BYTES)} (1.00 GB)`)
      console.error("")
      console.error("Последствия запуска без свободного места:")
      console.error("  · Turbopack не сможет записать .next/ JS-чанки (ERR_ABORTED чанков)")
      console.error("  · Next Dev Overlay: «missing required error components, refreshing…»")
      console.error("  · Невозможность коммитить git (ошибка .git/index.lock)")
      console.error("  · Битые файлы БД SQLite (недозапись WAL-журнала)")
      console.error("")
      console.error("Что сделать прямо сейчас (копируй команды):")
      console.error("")
      if (existsSync(nextDir)) {
        try {
          const entries = readdirSync(nextDir, { withFileTypes: true, recursive: true } as any) as Array<any>
          let size = 0
          for (const e of entries) {
            if (!e.isFile()) continue
            try {
              const abs = path.join((e as any).parentPath ?? nextDir, e.name)
              size += Number(lstatSync(abs).size)
            } catch { /* skip inaccessible */ }
          }
          console.error(`  1. Удалить Turbopack-кэш .next (освободит ~${formatBytes(BigInt(size))}):`)
        } catch {
          console.error(`  1. Удалить Turbopack-кэш .next (освободит ~10–25 GB):`)
        }
      } else {
        console.error(`  1. Удалить Turbopack-кэш .next (освободит ~10–25 GB):`)
      }
      console.error(`     PowerShell: Remove-Item -LiteralPath '.next' -Recurse -Force`)
      console.error(`     CMD     : rmdir /s /q .next`)
      console.error("")
      console.error(`  2. Очистить node_modules/.cache (${existsSync(nodeCacheDir) ? "существует" : "нет" }):`)
      console.error(`     PowerShell: Remove-Item -LiteralPath 'node_modules/.cache' -Recurse -Force -ErrorAction SilentlyContinue`)
      console.error("")
      console.error(`  3. Очистить Recycle Bin / Корзину диска Z (или ${tempDir}):`)
      console.error(`     PowerShell: Clear-RecycleBin -DriveLetter $([System.IO.Path]::GetPathRoot('${projectRoot}').Replace(':\\','') -replace '^[^A-Za-z]*','') -Force -ErrorAction SilentlyContinue`)
      console.error("")
      console.error(`  4. После очистки — перезапусти dev-сервер:`)
      console.error(`     npm run dev`)
      console.error("====================================================================")
      process.exit(2)
    }

    console.log(`[dev-server] Disk OK — ${formatBytes(free)} free (${freeGB.toFixed(2)} GB) ; threshold 1.00 GB`)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.warn(`[dev-server] ⚠️  Не удалось проверить свободное место на диске (${msg}). Продолжаем запуск…`)
  }
}
checkDiskSpace()

const nextBin = path.join(process.cwd(), "node_modules", ".bin", "next" + (process.platform === "win32" ? ".cmd" : ""))
const args = process.argv.slice(2)
const isWindows = process.platform === "win32"
const child = spawn(isWindows ? `"${nextBin}"` : nextBin, ["dev", ...args], {
  stdio: "inherit",
  env: process.env,
  shell: isWindows,
  windowsVerbatimArguments: isWindows,
})
child.on("exit", (code) => process.exit(code ?? 0))
child.on("error", (err) => { console.error(err); process.exit(1) })
