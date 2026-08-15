#!/usr/bin/env npx tsx
/**
 * Unified preflight / CI checks runner.
 * ====================================
 * Runs ALL critical static checks BEFORE dev server or build, in this order:
 *   1. env / deps sanity (package-lock? node_modules installed?)
 *   2. TypeScript tsc --noEmit (syntax + unresolved deps + type errors)
 *   3. Selfcheck suite (smart-test.ts --selfcheck-only → ~30 static *.selfcheck.ts)
 *
 * Logs EVERY detected error with: file, line, severity, message, source-stage
 * to BOTH (a) pretty console output AND (b) .preflight/errors.json so
 * developers / IDE / CI can quickly locate the problems.
 *
 * Any stage with CRITICAL failures → script exits with code != 0 so that
 *   • `npm run dev` refuses to start Next.js
 *   • `npm run build` exits before `next build`
 *   • GitHub Actions / any CI pipeline marks the job as failed.
 */

if (process.env.BUSTOUR_SKIP_PREFLIGHT === "1") {
  process.stdout.write("[preflight] BUSTOUR_SKIP_PREFLIGHT=1 — skipping (Docker builder)\n")
  process.exit(0)
}

import { mkdirSync, writeFileSync, existsSync, rmSync, readFileSync } from "node:fs"
import path from "node:path"
import { spawnSync, type SpawnSyncReturns } from "node:child_process"
import os from "node:os"

type Severity = "error" | "warning" | "info"
type Stage = "env" | "tsc" | "selfcheck" | "nextBuild"
type ErrorEntry = {
  stage: Stage
  severity: Severity
  file: string | null
  line: number | null
  column: number | null
  code: string | null
  message: string
  raw?: string
}

const ROOT = process.cwd()
const OUT_DIR = path.join(ROOT, ".preflight")
const ERRORS_JSON = path.join(OUT_DIR, "errors.json")
const LOG_TXT = path.join(OUT_DIR, "preflight.log")
const startedAt = new Date().toISOString()

const errors: ErrorEntry[] = []
const warnings: ErrorEntry[] = []

// ---- helpers ----------------------------------------------------------------

const IS_WIN = process.platform === "win32"
const NPM = IS_WIN ? "npm.cmd" : "npm"
const NPX = IS_WIN ? "npx.cmd" : "npx"
const TSX_ARGS = (script: string, extra: string[] = []) =>
  [script, ...extra]

function run(
  bin: string,
  args: string[],
  opts: { captureStdout?: boolean; captureStderr?: boolean } = {},
): SpawnSyncReturns<string> & { stdoutLines: string[]; stderrLines: string[] } {
  const res = spawnSync(bin, args, {
    cwd: ROOT,
    encoding: "utf8",
    shell: IS_WIN,
    windowsVerbatimArguments: IS_WIN,
    stdio: [
      "inherit",
      opts.captureStdout ? "pipe" : "inherit",
      opts.captureStderr ? "pipe" : "inherit",
    ] as any,
  })
  return {
    ...res,
    stdoutLines: String(res.stdout ?? "").split(/\r?\n/),
    stderrLines: String(res.stderr ?? "").split(/\r?\n/),
  }
}

function push(entry: ErrorEntry) {
  if (entry.severity === "warning") warnings.push(entry)
  else errors.push(entry)
}

function banner(title: string) {
  const bar = "=".repeat(76)
  const pad = " ".repeat(Math.max(0, Math.floor((76 - title.length) / 2)))
  console.log(`\n${bar}\n${pad}${title}\n${bar}\n`)
}

// 1. tsc error lines are like: path/to/file.ts(12,34): error TS1234: message
const TSC_RE = /^(.+?)\((\d+)(?:,(\d+))?\)\s*:\s*(error|warning)\s+([A-Z]+\d+)\s*:\s*(.+)$/
// 2. Node assert throws: AssertionError [ERR_ASSERTION]: Expected ... at ... selfcheck-name:line
const ASSERT_RE = /AssertionError.*at\s+(?:[^\s()]+\s*\()?([^\s():]+?):(\d+)(?::(\d+))?/

function parseTscLine(line: string): ErrorEntry | null {
  const m = line.match(TSC_RE)
  if (!m) return null
  const [, file, ln, col, sev, code, msg] = m
  return {
    stage: "tsc",
    severity: sev === "error" ? "error" : "warning",
    file: file ? path.resolve(ROOT, file) : null,
    line: ln ? Number(ln) : null,
    column: col ? Number(col) : null,
    code: code ?? null,
    message: msg?.trim() ?? line,
    raw: line,
  }
}

function finalizeReport(skipWriteFiles = false) {
  const totalErrors = errors.length
  const totalWarnings = warnings.length
  const criticalFail = totalErrors > 0

  if (!skipWriteFiles) {
    try {
      if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true })
      writeFileSync(ERRORS_JSON, JSON.stringify(
        { startedAt, finishedAt: new Date().toISOString(), errors, warnings, totals: { errors: totalErrors, warnings: totalWarnings } },
        null,
        2,
      ), "utf8")
      const txt: string[] = []
      txt.push(`Bustour CMS preflight — ${startedAt}`)
      txt.push(`Errors   : ${totalErrors}`)
      txt.push(`Warnings : ${totalWarnings}`)
      txt.push("")
      ;[...errors, ...warnings].forEach((e) => {
        const loc = e.file ? `${e.file}${e.line ? `:${e.line}${e.column ? `:${e.column}` : ""}` : ""}` : "(no location)"
        txt.push(`[${e.stage}] ${e.severity.toUpperCase()} ${e.code ?? ""} ${loc}`)
        txt.push(`    ${e.message.split("\n")[0]}`)
      })
      writeFileSync(LOG_TXT, txt.join("\n"), "utf8")
    } catch (err) {
      console.warn("[preflight] ⚠  couldn't write error report files:", String(err))
    }
  }

  console.log("")
  console.log("─".repeat(76))
  console.log(` PREFLIGHT SUMMARY  errors=${totalErrors}  warnings=${totalWarnings}  time=${(new Date().getTime() - new Date(startedAt).getTime())} ms`)
  console.log("─".repeat(76))
  if (criticalFail) {
    console.error(`\n❌ ${totalErrors} критические ошибки. Проект НЕ запущен / не собран.`)
    console.error(`   Детальный лог : ${ERRORS_JSON}`)
    console.error(`   Короткий отчёт: ${LOG_TXT}\n`)
    errors.slice(0, 30).forEach((e) => {
      const loc = e.file ? `${path.relative(ROOT, e.file)}${e.line ? `:${e.line}${e.column ? `:${e.column}` : ""}` : ""}` : "-"
      console.error(`  • [${e.stage}] ${e.severity} ${loc}  ${e.message.split("\n")[0]}`)
    })
    if (errors.length > 30) console.error(`  … +${errors.length - 30} ещё ошибок — см. ${LOG_TXT}`)
  } else {
    console.log("\n✅ Все критические проверки пройдены.")
    if (totalWarnings > 0) {
      console.log(`   ⚠ ${totalWarnings} предупреждений (не блокируют запуск).`)
      warnings.slice(0, 10).forEach((w) => {
        const loc = w.file ? `${path.relative(ROOT, w.file)}${w.line ? `:${w.line}` : ""}` : "-"
        console.log(`   • [${w.stage}] ${loc}  ${w.message.split("\n")[0]}`)
      })
    }
  }
  return { criticalFail, totalErrors, totalWarnings }
}

// ---- stage 0: env sanity ----------------------------------------------------
function stageEnv(): void {
  banner("STAGE 0 · env / dependencies")
  const need = ["node_modules/.bin/tsx", "node_modules/next/package.json", "node_modules/typescript/package.json"]
  for (const rel of need) {
    if (!existsSync(path.join(ROOT, rel))) {
      push({
        stage: "env",
        severity: "error",
        file: path.join(ROOT, "package.json"),
        line: 1,
        column: null,
        code: "ENV_NODE_MODULES_MISSING",
        message: `Отсутствует ${rel}. Сначала запустите: npm install`,
      })
    }
  }
  // node version required by Next 16: >=22
  const major = Number(process.versions.node.split(".")[0])
  if (major < 22) {
    push({
      stage: "env",
      severity: "error",
      file: null, line: null, column: null,
      code: "ENV_NODE_TOO_OLD",
      message: `Next.js 16 требует Node.js >= 22. Текущая: ${process.versions.node}.`,
    })
  }
  console.log(`  Node.js  : ${process.versions.node}`)
  console.log(`  Platform : ${process.platform} (${os.arch()})`)
  console.log(`  CWD      : ${ROOT}`)
}

// ---- stage 1: tsc --noEmit --------------------------------------------------
function stageTsc(): void {
  banner("STAGE 1 · TypeScript tsc --noEmit")
  // TSC from node_modules
  const tscBin = path.join(ROOT, "node_modules", ".bin", "tsc" + (IS_WIN ? ".cmd" : ""))
  if (!existsSync(tscBin)) {
    push({
      stage: "tsc", severity: "error",
      file: path.join(ROOT, "package.json"), line: 1, column: null,
      code: "TSC_MISSING", message: "node_modules/.bin/tsc не найден. npm install.",
    })
    return
  }
  // Paths with spaces need quoting on Windows shell.
  const tscCmd = IS_WIN ? `"${tscBin}"` : tscBin
  const res = spawnSync(tscCmd, ["--noEmit", "-p", "tsconfig.json"], {
    cwd: ROOT, encoding: "utf8", shell: true,
    stdio: ["ignore", "pipe", "pipe"],
    windowsVerbatimArguments: IS_WIN,
  })
  const allLines = (String(res.stdout ?? "") + "\n" + String(res.stderr ?? "")).split(/\r?\n/).filter(Boolean)
  let foundTsc = 0
  for (const ln of allLines) {
    const parsed = parseTscLine(ln)
    if (parsed) { push(parsed); foundTsc++ }
  }
  // If tsc exited non-zero but we found no structured errors (e.g. tsconfig parse
  // failure or missing .d.ts wholesale) → bubble one entry so dev sees it.
  if (res.status !== 0 && foundTsc === 0 && allLines.length > 0) {
    push({
      stage: "tsc", severity: "error",
      file: path.join(ROOT, "tsconfig.json"), line: 1, column: null,
      code: "TSC_UNSTRUCTURED",
      message: allLines.slice(0, 20).join(" | "),
      raw: allLines.join("\n"),
    })
  }
  const ok = res.status === 0
  console.log(`  Status : ${ok ? "OK ✅" : `FAIL (exit ${res.status}) · ${foundTsc} structured issues`}`)
  if (!ok) {
    console.log("  Preview:")
    allLines.slice(0, 10).forEach((l) => console.log("   " + l))
  }
}

// ---- stage 2: static selfcheck suite (smart-test --selfcheck-only) ---------
function stageSelfcheck(): void {
  banner("STAGE 2 · Selfcheck suite (smart-test --selfcheck-only)")
  const script = "scripts/smart-test.ts"
  if (!existsSync(path.join(ROOT, script))) {
    push({
      stage: "selfcheck", severity: "warning",
      file: path.join(ROOT, script), line: 1, column: null,
      code: "SELFCHECK_MISSING_SCRIPT",
      message: "scripts/smart-test.ts не найден — static selfcheck пропущен.",
    })
    return
  }
  const strictSelfcheck = process.argv.includes("--strict-selfcheck") || process.argv.includes("--selfcheck-fatal")
  const selfcheckSeverity: Severity = strictSelfcheck ? "error" : "warning"
  if (!strictSelfcheck) {
    console.log("  ℹ Selfcheck failures treat as WARNING. Use --strict-selfcheck to fail CI.")
  }
  // Use CWD-relative paths so shell:true on Windows doesn't split project dir
  // name with a space (e.g. "bustour latest").
  const args = ["scripts/smart-test.ts", "--selfcheck-only"]
  // Prefer the exact same `tsx` binary we are running under — avoids relying
  // on a global npm install. Under shell:true we pass the full command line
  // as the first argument (no args array).
  const cmdLine = (IS_WIN ? "tsx.cmd" : "tsx") + " " + args.map((a) => /\s/.test(a) ? `"${a}"` : a).join(" ")
  const res = spawnSync(cmdLine, {
    cwd: ROOT,
    encoding: "utf8",
    shell: true,
    stdio: ["ignore", "pipe", "pipe"],
    windowsVerbatimArguments: false,
  })
  const stdout = String(res.stdout ?? "")
  const stderr = String(res.stderr ?? "")
  const allLines = (stdout + "\n" + stderr).split(/\r?\n/)
  const ok = res.status === 0
  const tail = allLines.slice(-15)
  console.log(`  Status : ${ok ? "OK ✅" : `FAIL (exit ${res.status ?? -1})`}`)
  // Live-pass-through of the selfcheck log lines for visibility.
  const passThrough = allLines.filter(Boolean)
  passThrough.forEach((l) => console.log("   " + l))
  if (!ok) {
    const tailStr = tail.join("\n")
    const selfcheckNameMatch = tailStr.match(/scripts[\/\\]([^\/\\]+\.selfcheck\.ts)/i)
    const file = selfcheckNameMatch
      ? path.join(ROOT, "scripts", selfcheckNameMatch[1]!)
      : path.join(ROOT, script)
    let ln: number | null = null
    let col: number | null = null
    const mm = tailStr.match(ASSERT_RE)
    if (mm) {
      ln = Number(mm[2]); col = mm[3] ? Number(mm[3]) : null
    }
    // Try to capture the specific assertion message (first line with AssertionError after last ==...)
    const msgMatch = tailStr.match(/AssertionError(?:\s*\[[^\]]*\])?:\s*([^\n\r]+)/)
    const message = msgMatch?.[1]?.trim() ?? tail.slice(-3).join(" | ").slice(0, 400)
    push({
      stage: "selfcheck", severity: selfcheckSeverity,
      file, line: ln, column: col,
      code: "SELFCHECK_FAIL",
      message,
      raw: tailStr,
    })
  }
}

// ---- stage 3 (optional): next build tracking -------------------------------
export function stageNextBuild(argv: string[]): void {
  banner("STAGE 3 · next build (tracks errors + warnings)")
  const nextBin = path.join(ROOT, "node_modules", ".bin", "next" + (IS_WIN ? ".cmd" : ""))
  if (!existsSync(nextBin)) {
    push({
      stage: "nextBuild", severity: "error",
      file: path.join(ROOT, "package.json"), line: 1, column: null,
      code: "NEXT_MISSING",
      message: "node_modules/.bin/next не найден — npm install.",
    })
    return
  }
  // Force clean .next/types cache so stale validator doesn't bite (per our
  // prior Vercel Blob removal bug). Keep .next dir itself (minimize churn).
  const typesDir = path.join(ROOT, ".next", "types")
  if (existsSync(typesDir)) {
    try { rmSync(typesDir, { recursive: true, force: true }) } catch { /* ignore */ }
  }
  const res = spawnSync(IS_WIN ? `"${nextBin}"` : nextBin, ["build", ...argv], {
    cwd: ROOT, encoding: "utf8", shell: true,
    stdio: ["ignore", "pipe", "pipe"],
    windowsVerbatimArguments: IS_WIN,
  })
  const allLines = (String(res.stdout ?? "") + "\n" + String(res.stderr ?? "")).split(/\r?\n/)
  // Pass-through streaming output line by line (build is noisy, we want live log).
  // But we also keep for errors parsing.
  const outStream = process.stdout
  allLines.forEach((l) => outStream.write(l + "\n"))

  // Next build error patterns:
  const nextErrorRe = /(Error|error)\s*(?:-|:)\s*(.+?)\s*(?:in\s*|\(([^\n:)]+:\d+(?::\d+)?)\))/i
  // ⚠ ./path.ts (L:C) @ next/head → also capture
  const srcLocRe = /(?:^|[^a-zA-Z])([A-Za-z]:\\[^\s():]+?|\.?\/[^\s():]+?)\((\d+)(?::(\d+))?\)/
  let buildErrorFound = false
  for (const ln of allLines) {
    if (!ln.trim()) continue
    // 1. structured next error with location
    const mm = ln.match(srcLocRe)
    const hasErrWord = /\b(error|failed|error×|failed ✓ failed)\b/i.test(ln)
    if (mm && hasErrWord) {
      const [, file, lnNum, colNum] = mm
      buildErrorFound = true
      push({
        stage: "nextBuild", severity: "error",
        file: path.isAbsolute(file) ? file : path.resolve(ROOT, file),
        line: Number(lnNum), column: colNum ? Number(colNum) : null,
        code: "NEXT_BUILD_ERROR",
        message: ln.slice(0, 500),
        raw: ln,
      })
    }
    // 2. warning lines → non-blocking
    if (/\b(?:warn|warning)\b/i.test(ln) && !buildErrorFound) {
      const mm2 = ln.match(srcLocRe)
      push({
        stage: "nextBuild", severity: "warning",
        file: mm2 ? (path.isAbsolute(mm2[1]) ? mm2[1] : path.resolve(ROOT, mm2[1])) : null,
        line: mm2?.[2] ? Number(mm2[2]) : null,
        column: mm2?.[3] ? Number(mm2[3]) : null,
        code: "NEXT_BUILD_WARNING",
        message: ln.slice(0, 400),
        raw: ln,
      })
    }
  }
  if (res.status !== 0 && errors.filter(e => e.stage === "nextBuild").length === 0) {
    buildErrorFound = true
    push({
      stage: "nextBuild", severity: "error",
      file: path.join(ROOT, "next.config.ts"),
      line: 1, column: null,
      code: "NEXT_BUILD_EXIT_NONZERO",
      message: allLines.slice(-5).join(" | ").slice(0, 500),
      raw: allLines.slice(-50).join("\n"),
    })
  }
  console.log(`  Status : ${buildErrorFound ? `FAIL — см. ${LOG_TXT}` : "OK ✅"}`)
}

// ---- top-level orchestration -----------------------------------------------
type Mode = "dev" | "check" | "build"
function parseMode(): Mode {
  const flags = process.argv.slice(2)
  if (flags.includes("--build")) return "build"
  if (flags.includes("--dev") || flags.includes("--check")) return "check"
  return "check"
}

async function main() {
  const mode = parseMode()
  stageEnv()
  stageTsc()
  stageSelfcheck()
  if (mode === "build") {
    // Only attempt next build if static checks already green.
    const { criticalFail } = finalizeReport(true)
    if (criticalFail) {
      console.error("\n[preflight] ⛔ Сборка отменена: критические ошибки на tsc/selfcheck стадиях.")
      finalizeReport(false)
      process.exit(4)
    }
    const PREFLIGHT_ONLY_FLAGS = new Set([
      "--build", "--check", "--dev", "--strict-selfcheck",
    ])
    const buildArgv = process.argv.slice(2).filter((a) => !PREFLIGHT_ONLY_FLAGS.has(a))
    stageNextBuild(buildArgv)
  }
  const summary = finalizeReport(false)
  if (summary.criticalFail) process.exit(3)
}

void main()
