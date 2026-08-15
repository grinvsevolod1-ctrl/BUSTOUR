import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

type SaveFn = { file: string; name: string; kind: string }

function collectSaveFns(full: string, file: string): SaveFn[] {
  const fns: SaveFn[] = []
  const re = /export\s+async\s+function\s+(save[A-Z]\w*|delete[A-Z]\w*|update[A-Z]\w*|create[A-Z]\w*|restore[A-Z]\w*|purge[A-Z]\w*|move[A-Z]\w*|reorder[A-Z]\w*|archive[A-Z]\w*|approve[A-Z]\w*|set[A-Z]\w*Action)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(full)) !== null) {
    fns.push({ file, name: m[1], kind: m[1].replace(/Action$/, "") })
  }
  return fns
}

function extractFnBody(full: string, fnName: string): string {
  const needle = `export async function ${fnName}`
  const start = full.indexOf(needle)
  if (start < 0) return ""
  const openPar = full.indexOf("(", start + needle.length)
  if (openPar < 0) return ""
  let depthPar = 1
  let depthAngle = 0
  let depthBraceSig = 0
  let inSingle = false
  let inDouble = false
  let inBacktick = false
  let prev = ""
  let i = openPar + 1
  while (i < full.length && depthPar > 0) {
    const c = full[i]
    if (!inSingle && !inDouble && !inBacktick) {
      if (c === "<") depthAngle++
      else if (c === ">" && depthAngle > 0) depthAngle--
      else if (c === "{") depthBraceSig++
      else if (c === "}" && depthBraceSig > 0) depthBraceSig--
      else if (c === "(" && depthAngle === 0 && depthBraceSig === 0) depthPar++
      else if (c === ")" && depthAngle === 0 && depthBraceSig === 0) depthPar--
      else if (c === "'") inSingle = true
      else if (c === '"') inDouble = true
      else if (c === "`") inBacktick = true
    } else {
      if (c === "'" && inSingle && prev !== "\\") inSingle = false
      else if (c === '"' && inDouble && prev !== "\\") inDouble = false
      else if (c === "`" && inBacktick && prev !== "\\") inBacktick = false
    }
    prev = c
    i++
  }
  let k = i
  let aDepth = 0
  let sS = false, sD = false, sB = false
  let pCh = ""
  let openBrace = -1
  while (k < full.length) {
    const ch = full[k]
    if (!sS && !sD && !sB) {
      if (ch === "<") aDepth++
      else if (ch === ">" && aDepth > 0) aDepth--
      else if (ch === "{" && aDepth === 0) { openBrace = k; break }
      else if (ch === "'") sS = true
      else if (ch === '"') sD = true
      else if (ch === "`") sB = true
    } else {
      if (ch === "'" && sS && pCh !== "\\") sS = false
      else if (ch === '"' && sD && pCh !== "\\") sD = false
      else if (ch === "`" && sB && pCh !== "\\") sB = false
    }
    pCh = ch
    k++
  }
  if (openBrace < 0) return full.slice(start, i)
  let depthBrace = 1
  let j = openBrace + 1
  let inS = false
  let inD = false
  let inB = false
  let p = ""
  while (j < full.length && depthBrace > 0) {
    const c = full[j]
    if (!inS && !inD && !inB) {
      if (c === "{") depthBrace++
      else if (c === "}") depthBrace--
      else if (c === "'") inS = true
      else if (c === '"') inD = true
      else if (c === "`") inB = true
    } else {
      if (c === "'" && inS && p !== "\\") inS = false
      else if (c === '"' && inD && p !== "\\") inD = false
      else if (c === "`" && inB && p !== "\\") inB = false
    }
    p = c
    j++
  }
  return full.slice(start, j)
}

// withAdminAction() / withAdminAction<T>() encapsulates auth + audit (lib/admin-action.ts)
const WITH_ADMIN_ACTION_RE = /withAdminAction\s*(<[^>]*>)?\s*\(/

function hasRequire(body: string): boolean {
  return /requireAdmin\s*\(|requireCapability\s*\(/.test(body) || WITH_ADMIN_ACTION_RE.test(body)
}

function hasAudit(body: string): boolean {
  return /writeAudit\(|auditTourSnapshot\(/.test(body) || WITH_ADMIN_ACTION_RE.test(body)
}

const SLUGGED_RE = /(slug|find.*Slug|slugOwner|getTour\(|getBus\(|getTransfer\(|getArticle\(|findArticleIdBySlug|findTourIdBySlug|resolveSlugConflict|getCity|getCountry)/i

function hasSlugUniqueGuard(body: string, fnName: string, fullLibSrc: Record<string, string>): boolean {
  const inline =
    /conflict.*slug|slug.*already|slugOwner\s*&&|find\w+IdBySlug|resolveSlugConflict|slug.*существует|slug.*занят|занят.*системной|Роль уже существует|save(Country|City)Aggregate/.test(
      body,
    )
  if (inline) return true
  // Transitively: if action calls updateCity/updateCountry/createCity/createCountry/createCustomAdminRole AND
  // the called lib function throws unique/slug error then treat as covered (preflight inside the call).
  const proxied = [...body.matchAll(/(update|create)(Country|City)\s*\(|createCustomAdminRole\s*\(/g)].map((m) =>
    m[0].replace(/\s*\($/, "").toString(),
  )
  for (const fn of proxied) {
    const fileMap: Record<string, string> = {
      updateCountry: "countries.ts",
      createCountry: "countries.ts",
      updateCity: "cities.ts",
      createCity: "cities.ts",
      createCustomAdminRole: "admin-role-catalog.ts",
    }
    const libFile = fileMap[fn]
    if (!libFile) continue
    const src = fullLibSrc[libFile] || (fullLibSrc[libFile] = (() => {
      const p = require("path").resolve(__dirname, "..", "lib", libFile)
      return require("fs").existsSync(p) ? require("fs").readFileSync(p, "utf8") : ""
    })())
    if (!src) continue
    if (fn === "createCustomAdminRole") {
      if (/Роль уже существует|занят системной ролью/.test(src)) return true
    } else {
      const re = new RegExp(
        `export\\s+async\\s+function\\s+${fn}\\s*\\([\\s\\S]*?code:\\s*["']SLUG_EXISTS`,
      )
      if (re.test(src)) return true
    }
  }
  return false
}

function main() {
  const adminDir = path.resolve(__dirname, "..", "app", "admin")
  const actionFiles = ["actions.ts", "cms-actions.ts", "city-actions.ts", "country-actions.ts", "staff-actions.ts", "shortcode-actions.ts", "cert-actions.ts", "bus-tour-type-actions.ts", "currency-actions.ts", "role-actions.ts", "audit-actions.ts", "user-actions.ts"]
    .map((name) => path.join(adminDir, name))
    .filter((p) => fs.existsSync(p))

  const libDir = path.resolve(__dirname, "..", "lib")
  const fullLibSrc: Record<string, string> = Object.fromEntries(
    ["countries.ts", "cities.ts"].map((n) => [n, fs.existsSync(path.join(libDir, n)) ? fs.readFileSync(path.join(libDir, n), "utf8") : ""]),
  )

  const all: SaveFn[] = []
  for (const f of actionFiles) {
    const src = fs.readFileSync(f, "utf8")
    all.push(...collectSaveFns(src, f))
  }

  const saveMutations = all.filter((f) => !/^(move|reorder|restore|archive|purge|approve|set.*ShowOn)$/.test(f.kind.replace(/Action$/, "")) && !["saveSettingsAction", "saveBusPageAction", "saveTransferPageAction", "saveArticlePageAction", "saveTourPageAction", "saveCityPageAction", "saveCountryPageAction", "saveHomePageAction", "saveCompanyPageAction"].includes(f.name))

  let fail = 0
  for (const fn of saveMutations) {
    const src = fs.readFileSync(fn.file, "utf8")
    const body = extractFnBody(src, fn.name)
    if (!body) continue
    const gotRequire = hasRequire(body)
    const gotAudit = hasAudit(body)
    // Slug preflight: any slugged entity save (bus/tour/city/country/transfer/article/currency/certSection/busTourType/staff/shortcode)
    // should perform slug-unique check before mutation. Exclude:
    //  - id-scoped sub-mutations (saveTourDatesTableAction → tourId-bound, not an entity save)
    //  - id-scoped deletes/archives/purges/restores by numeric id only
    //  - audit retentions / login / status toggles
    const isIdScopedSub = /DatesTable|LeadStatus|ReviewShowOn|TransferSchedules/.test(fn.name)
    const isByIdOnly = /^(delete|restore|archive|purge|move|reorder)[A-Z]/.test(fn.kind)
    const appearsSlugged = !isIdScopedSub && !isByIdOnly && SLUGGED_RE.test(body)
    const hasSlugUnique =
      /conflict.*slug|slug.*already|slugOwner\s*&&|find\w+IdBySlug|resolveSlugConflict|code:\s*["']SLUG_EXISTS|get\w+\([\s\S]{0,80}\.slug[\s\S]{0,260}conflict\.id\s*!==\s*id|ensureCountry\(|slug.*существует|slug.*занят|занят.*системной|Роль уже существует/.test(body) ||
      hasSlugUniqueGuard(body, fn.name, fullLibSrc)
    const missingRequire = !gotRequire
    const missingAudit = !gotAudit
    const missingSlugGuard = appearsSlugged && !hasSlugUnique
    if (missingRequire || missingAudit || missingSlugGuard) {
      fail++
      const parts: string[] = []
      if (missingRequire) parts.push("NO requireAdmin/requireCapability")
      if (missingAudit) parts.push("NO writeAudit")
      if (missingSlugGuard) parts.push("NO slug-unique preflight (but references slug API)")
      console.log(`⚠ ${path.basename(fn.file)} :: ${fn.name} → ${parts.join("; ")}`)
    }
    assert.ok(gotRequire, `${fn.name}: requireAdmin / requireCapability missing`)
    assert.ok(gotAudit, `${fn.name}: writeAudit missing`)
    if (appearsSlugged) assert.ok(hasSlugUnique, `${fn.name}: slug uniqueness preflight missing (uses slug API but no conflict check)`)
  }

  console.log(`OK: admin-saves contract verified across ${saveMutations.length} mutation functions in ${actionFiles.length} files — 0/${fail} contract violations`)
}

main()
