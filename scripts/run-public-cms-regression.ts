/**
 * Run catalog CMS regression selfchecks + write analysis report.
 * Run: npx tsx scripts/run-public-cms-regression.ts
 */
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const day = "2026 07 22"
const outDir = path.join(root, "analisis", day)
fs.mkdirSync(outDir, { recursive: true })

const CHECKS = [
  "scripts/public-cms-regression.selfcheck.ts",
  "scripts/home-section-parity.selfcheck.ts",
  "scripts/cms-page-section-parity.selfcheck.ts",
  "scripts/sidebar-visibility.selfcheck.ts",
  "scripts/faq-single-save-avia.selfcheck.ts",
]

type Row = { script: string; ok: boolean; ms: number; output: string }

const rows: Row[] = []
let failed = 0

for (const script of CHECKS) {
  const started = Date.now()
  const r = spawnSync("npx", ["tsx", script], {
    cwd: root,
    encoding: "utf8",
    shell: true,
  })
  const ms = Date.now() - started
  const output = `${r.stdout ?? ""}${r.stderr ?? ""}`.trim()
  const ok = r.status === 0
  if (!ok) failed++
  rows.push({ script, ok, ms, output })
  console.log(`${ok ? "PASS" : "FAIL"} ${script} (${ms}ms)`)
  if (!ok) console.log(output.slice(0, 800))
}

const stamp = new Date().toISOString()
const md = `# Public CMS regression — ${day}

Generated: ${stamp}

## Scope (past bug classes)

| Bug class | Symptom | Guard |
|---|---|---|
| FAQ single-save / page scope | Local «Сохранить FAQ»; public FAQ ignored page settings | admin buildFaqFormIds; getFaqBlocksForPage |
| City cards on homes | Section cities swallowed / missing | ResortCards + no bare return null |
| Sidebar | «Все направления» in sidebar; hidden cities listed | countryOptions; city.visible filter |
| Country/city CMS empty | Admin h1/seo/cities filled, public ignores | CMS markers on bus/avia/hot × country/city |

## Matrix

bus / avia / hot × home / country / city (+ site home FAQ, ToursSidebar, getCitiesByCountry)

## Results

| Script | Status | ms |
|---|---|---|
${rows.map((r) => `| \`${r.script}\` | ${r.ok ? "PASS" : "FAIL"} | ${r.ms} |`).join("\n")}

## Verdict

${failed === 0 ? "**PASS** — all regression selfchecks green." : `**FAIL** — ${failed} check(s) failed.`}

## Raw output

${rows
  .map(
    (r) => `### ${r.script}

\`\`\`
${r.output.slice(0, 4000) || "(empty)"}
\`\`\`
`,
  )
  .join("\n")}
`

const reportPath = path.join(outDir, "public-cms-regression.md")
fs.writeFileSync(reportPath, md, "utf8")
console.log(`report: ${path.relative(root, reportPath)}`)
process.exit(failed === 0 ? 0 : 1)
