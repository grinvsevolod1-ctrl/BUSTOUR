/**
 * Smart test runner: static selfchecks (no DB/server-only) then Playwright e2e.
 *
 *   npm run test:smart                 # static selfchecks → full e2e
 *   npm run test:selfcheck             # static selfchecks only
 *   npm run test:failed                # cached failed e2e only
 *   npx tsx scripts/smart-test.ts --all-selfcheck          # include DB/server selfchecks
 *   npx tsx scripts/smart-test.ts --all-selfcheck --selfcheck-only
 *   npx tsx scripts/smart-test.ts --skip-selfcheck
 *   npx tsx scripts/smart-test.ts e2e/foo.spec.ts
 */
import { spawn, spawnSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"

const ROOT = process.cwd()
const FAILED_CACHE = path.join(ROOT, ".failed-specs.json")
const SCRIPTS_DIR = path.join(ROOT, "scripts")
const TSX_CLI = path.join(ROOT, "node_modules", "tsx", "dist", "cli.mjs")

/** Playwright line reporter: `  1) [chromium] › e2e\foo.spec.ts:12:7 › …` */
const FAILED_SPEC_RE =
  /^\s+\d+\)\s+(?:\[[^\]]+\]\s+)?›\s+(e2e[\\/][^\s:]+\.spec\.ts)/

/** Selfchecks that hit DB / server-only / live HTTP — skip unless --all-selfcheck */
const SERVER_SELFCHECK_RE =
  /ensureDb\s*\(|from\s+["']server-only["']|DATABASE_URL|from\s+["']@\/lib\/queries["']|import\(\s*["'][^"']*queries|PLAYWRIGHT_BASE_URL|localhost:\d+|from\s+["']@\/app\/robots["']|from\s+["']@\/lib\/review-contact["']/

type Flags = {
  onlyFailed: boolean
  skipSelfcheck: boolean
  selfcheckOnly: boolean
  allSelfcheck: boolean
  playwrightArgs: string[]
}

function parseFlags(argv: string[]): Flags {
  const onlyFailed = argv.includes("--only-failed")
  const skipSelfcheck = argv.includes("--skip-selfcheck")
  const selfcheckOnly = argv.includes("--selfcheck-only")
  const allSelfcheck = argv.includes("--all-selfcheck")
  const playwrightArgs = argv.filter(
    (a) =>
      a !== "--only-failed" &&
      a !== "--skip-selfcheck" &&
      a !== "--selfcheck-only" &&
      a !== "--all-selfcheck",
  )
  return { onlyFailed, skipSelfcheck, selfcheckOnly, allSelfcheck, playwrightArgs }
}

function readFailedSpecs(): string[] {
  if (!fs.existsSync(FAILED_CACHE)) return []
  try {
    const cached: unknown = JSON.parse(fs.readFileSync(FAILED_CACHE, "utf8"))
    return Array.isArray(cached) && cached.every((item) => typeof item === "string") ? cached : []
  } catch {
    return []
  }
}

export function parseFailedSpecFromLine(line: string): string | null {
  const m = line.match(FAILED_SPEC_RE)
  return m ? m[1]!.replaceAll("\\", "/") : null
}

export function isServerSelfcheckSource(src: string): boolean {
  return SERVER_SELFCHECK_RE.test(src)
}

function listSelfchecks(all: boolean): { run: string[]; skipped: string[] } {
  const allFiles = fs
    .readdirSync(SCRIPTS_DIR)
    .filter((name) => name.endsWith(".selfcheck.ts"))
    .sort()
    .map((name) => path.join(SCRIPTS_DIR, name))

  if (all) return { run: allFiles, skipped: [] }

  const run: string[] = []
  const skipped: string[] = []
  for (const file of allFiles) {
    const src = fs.readFileSync(file, "utf8")
    if (isServerSelfcheckSource(src)) skipped.push(file)
    else run.push(file)
  }
  return { run, skipped }
}

function runSelfchecks(all: boolean): number {
  if (!fs.existsSync(TSX_CLI)) {
    console.error(`[SmartTest] tsx CLI not found: ${TSX_CLI}`)
    return 1
  }
  const { run: files, skipped } = listSelfchecks(all)
  const mode = all ? "all (incl. DB/server)" : "static (no DB/server-only)"
  console.log(`[SmartTest] Selfcheck (${mode}): ${files.length} files`)
  if (skipped.length) {
    console.log(`[SmartTest] Пропущено server/DB: ${skipped.length} (флаг --all-selfcheck чтобы включить)\n`)
  } else {
    console.log("")
  }

  for (const file of files) {
    const rel = path.relative(ROOT, file).replaceAll("\\", "/")
    console.log(`== ${rel} ==`)
    const result = spawnSync(process.execPath, [TSX_CLI, file], {
      cwd: ROOT,
      env: process.env,
      stdio: "inherit",
    })
    if (result.error) {
      console.error(`[SmartTest] Failed to spawn: ${result.error.message}`)
      return 1
    }
    const code = result.status ?? 1
    if (code !== 0) {
      console.error(`\n[SmartTest] Selfcheck failed: ${rel} (exit ${code})`)
      return code
    }
  }
  console.log("\n[SmartTest] Selfchecks ok.\n")
  return 0
}

function resolvePlaywrightTargets(flags: Flags): string[] | null {
  if (flags.playwrightArgs.length > 0) return flags.playwrightArgs

  if (flags.onlyFailed) {
    const cached = readFailedSpecs()
    if (cached.length > 0) {
      console.log(`[SmartTest] Только упавшие e2e: ${cached.length}`)
      return cached
    }
    console.log("[SmartTest] Кэш падавших e2e пуст. Запуск не требуется.")
    return null
  }

  return []
}

function runPlaywright(targets: string[]): void {
  const playwrightCli = path.join(ROOT, "node_modules", "playwright", "cli.js")
  const args = [
    playwrightCli,
    "test",
    ...targets,
    "--reporter=line",
    "--max-failures=100",
    "--retries=0",
  ]

  console.log(`[SmartTest] E2E: npx playwright ${args.slice(1).join(" ")}\n`)

  const child = spawn(process.execPath, args, {
    env: { ...process.env, CI: "1" },
    shell: false,
  })
  const failedSpecs = new Set<string>()
  let stdoutBuffer = ""
  let stderrBuffer = ""

  const printLine = (line: string, stderr = false) => {
    if (line.includes("[WebServer]") || line.includes("Tourvisor")) return

    const failed = parseFailedSpecFromLine(line)
    if (failed) failedSpecs.add(failed)

    if (line.trim()) (stderr ? process.stderr : process.stdout).write(`${line}\n`)
  }

  const flushLines = (chunk: Buffer, stderr = false) => {
    const combined = (stderr ? stderrBuffer : stdoutBuffer) + chunk.toString()
    const lines = combined.split(/\r?\n/)
    const remainder = lines.pop() ?? ""
    if (stderr) stderrBuffer = remainder
    else stdoutBuffer = remainder
    for (const line of lines) printLine(line, stderr)
  }

  child.stdout.on("data", (chunk: Buffer) => flushLines(chunk))
  child.stderr.on("data", (chunk: Buffer) => flushLines(chunk, true))
  child.on("error", (error) => {
    console.error(`[SmartTest] Не удалось запустить Playwright: ${error.message}`)
  })
  child.on("close", (code, signal) => {
    if (stdoutBuffer) printLine(stdoutBuffer)
    if (stderrBuffer) printLine(stderrBuffer, true)

    const exitCode = code ?? 1
    if (exitCode === 0) {
      console.log("\n[SmartTest] Все тесты прошли.")
      fs.rmSync(FAILED_CACHE, { force: true })
    } else {
      console.error(`\n[SmartTest] E2E сбой: exit code ${exitCode}${signal ? `, signal ${signal}` : ""}.`)
      fs.mkdirSync(path.dirname(FAILED_CACHE), { recursive: true })
      fs.writeFileSync(FAILED_CACHE, `${JSON.stringify([...failedSpecs], null, 2)}\n`)
      console.error(`[SmartTest] Кэш обновлён: ${[...failedSpecs].join(", ") || "путь спека не распознан"}`)
    }
    process.exitCode = exitCode
  })
}

function main() {
  const flags = parseFlags(process.argv.slice(2))

  if (flags.selfcheckOnly) {
    process.exitCode = runSelfchecks(flags.allSelfcheck)
    return
  }

  if (flags.onlyFailed || flags.skipSelfcheck) {
    console.log(
      flags.onlyFailed
        ? "[SmartTest] Selfcheck пропущен (--only-failed).\n"
        : "[SmartTest] Selfcheck пропущен (--skip-selfcheck).\n",
    )
  } else {
    const code = runSelfchecks(flags.allSelfcheck)
    if (code !== 0) {
      process.exitCode = code
      return
    }
  }

  const targets = resolvePlaywrightTargets(flags)
  if (targets === null) return
  runPlaywright(targets)
}

const ranAsCli =
  typeof process.argv[1] === "string" &&
  /(?:^|[/\\])smart-test\.ts$/.test(process.argv[1])

if (ranAsCli) main()
