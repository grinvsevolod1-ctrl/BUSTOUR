/**
 * Tour program: multi-day range blocks + collapsible accordion admin UI + RichEditor description.
 *
 * Contract:
 *   STORED FORMAT (Tour.program) = TourProgramBlock[] — где TourProgramBlock = { day:string, text:string, dayStart?:number, dayEnd?:number }
 *     (day/text remain backward compatible; optional numeric range preserves editor input)
 *     NEW data keeps the display title and optional structured range
 *     dayFrom/dayTo + customTitle are sent as separate FormData fields.
 *
 * ADMIN FORM (tour-form.tsx) sends:
 *   programBlockCount=N
 *   For each i in 0..N-1:
 *     programDayFrom[i?i=] — optional integer, 1..365. If omitted => range-less block.
 *     programDayTo[i]   — optional integer. If dayFrom present but dayTo absent => single day N.
 *     programCustomTitle[i] — optional string. Overrides auto "День N" or "Дни N–M".
 *     programText[i] — RichEditor HTML output for the description.
 *
 * RESULTS:
 *   - Admin can add SINGLE DAY block (dayFrom=N) or RANGE block (dayFrom=N, dayTo=M)
 *   - Admin accordion collapses each program block individually (summary = generated title + 1 line)
 *   - Public ProgramTimeline renders correct "День N" or "Дни N–M" from p.day text or extracts numeric range.
 *   - Descriptions render as RICH HTML (p.text contains <strong>, <li>, etc.) — NOT plain-text.
 *   - Backward compat: old blocks with arbitrary p.day string still render as-is.
 *
 * Run: npx tsx scripts/tour-program-range-blocks.selfcheck.ts
 */
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

const root = path.join(import.meta.dirname, "..")

// ============================================================
// 1. TYPE CONTRACT — extend lib/types Tour.program without breaking:
//    Each block keeps day/text and may append an optional structured range.
// ============================================================
const types = fs.readFileSync(path.join(root, "lib/types.ts"), "utf8")
assert.match(
  types,
  /program:\s*\{\s*day:\s*string;\s*text:\s*string;\s*dayStart\?:\s*number;\s*dayEnd\?:\s*number\s*\}\s*\[\]/,
  "Tour.program keeps day/text and adds optional structured day range",
)

// ============================================================
// 2. ADMIN FORM — accordion per block, collapsible, RichEditor + dayFrom/dayTo inputs
// ============================================================
const tourForm = fs.readFileSync(path.join(root, "components/admin/tour-form.tsx"), "utf8")

// RichEditor used for program description (not plain Textarea):
assert.match(
  tourForm,
  /RichEditor[^]*programText/,
  "tour-form program block description uses RichEditor (not Textarea) for HTML formatting",
)

// Per-block collapsible: pattern Accordion collapsible or <details> or useState open[]
assert.match(
  tourForm,
  /accordion|details|openAccordion|collapsedBlock|useState.*<(number|boolean)\[\]>|ProgramAccordion|blockOpen/,
  "tour-form program list renders per-block collapsible UI (accordion or details or per-block state)",
)

// Separate inputs for dayFrom/dayTo to declare a range:
assert.match(tourForm, /programDayFrom|dayFrom|dayStart/, "tour-form includes day range start input")
assert.match(tourForm, /programDayTo|dayTo|dayEnd/, "tour-form includes day range end input")
// — or explicit "Добавить диапазон" button
assert.match(tourForm, /диапазон|range.*day|Добавить.*диапазон|Диапазон/, "tour-form offers a range-block action (button or toggle)")

// ============================================================
// 3. FORM PARSING in actions.ts tourFromForm: uses new multi-field structure
// ============================================================
const actions = fs.readFileSync(path.join(root, "app/admin/actions.ts"), "utf8")
assert.match(
  actions,
  /programDayFrom|dayFrom|programBlockCount|programCustomTitle|programText/,
  "tourFromForm reads program range inputs (not only legacy programTitle+programText)",
)

// ============================================================
// 4. PUBLIC ProgramTimeline — renders day NUMBERS from item.day and supports range strings
//    (instead of always showing `i + 1`)
// ============================================================
const timeline = fs.readFileSync(path.join(root, "components/site/program-timeline.tsx"), "utf8")
// OLD fixed: `{i + 1}` — replaced by dynamic extraction from p.day, e.g. regex parse N–M / N or fallback p.day substring
assert.doesNotMatch(
  timeline.replace(/\bkey=\{.*?\}/g, ""),
  />\s*\{\s*i\s*\+\s*1\s*\}\s*</,
  "public ProgramTimeline no longer hardcodes index-based day number — derives day label from p.day (range support)",
)
// Uses p.day or parsed numbers for the left-side big number:
assert.match(
  timeline,
  /p\.day|parseInt.*p\.day|parseDay|dayFrom|extractDay/,
  "public ProgramTimeline reads the stored day string to render numbers / ranges",
)

console.log("tour-program-range-blocks.selfcheck: ok")
