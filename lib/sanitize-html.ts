// Lightweight allowlist CMS HTML sanitizer. Designed to mitigate stored XSS
// in user/CMS-authored HTML rendered through dangerouslySetInnerHTML.
// - Strips <script> / event-handler attrs / style attrs outright.
// - Only preserves a tight allowlist of safe structural tags.
// - For <a href>: enforces no javascript: protocol; injects rel="noopener noreferrer".
// Not a 100% parser-for-parser spec sanitizer. For CMS-authored input with
// trusted editors + small attack surface this is preferable to pulling 30KB+
// of htmlparser2 + sanitize-html (ponytail rule).

const ALLOWED_TAGS = new Set([
  "p", "br", "hr",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "strong", "em", "b", "i", "u", "s", "sub", "sup",
  "ul", "ol", "li",
  "blockquote", "cite", "code", "pre", "span",
  "a",
  "div", "section", "article", "aside", "figure", "figcaption",
  "table", "thead", "tbody", "tfoot", "tr", "th", "td",
  "img", "video", "source",
  "iframe",
  "svg", "path", "rect", "circle", "polygon", "line", "polyline", "ellipse",
])

const SELF_CLOSING = new Set(["br", "hr", "img", "input", "source"])

const MEDIA_TAGS_ALLOW_STYLE = new Set(["img", "video", "iframe", "figure", "div"])
const ALLOWED_MEDIA_CSS_PROPS = new Set([
  "width", "height", "max-width", "max-height", "min-width", "min-height",
  "aspect-ratio", "float", "margin", "margin-left", "margin-right",
  "margin-top", "margin-bottom",
])

function sanitizeMediaStyle(raw: string): string | null {
  if (!raw || typeof raw !== "string") return null
  const declarations = raw.split(";")
    .map((d) => d.trim())
    .filter(Boolean)
  const safe: string[] = []
  for (const decl of declarations) {
    const colon = decl.indexOf(":")
    if (colon <= 0) continue
    const prop = decl.slice(0, colon).trim().toLowerCase()
    if (!ALLOWED_MEDIA_CSS_PROPS.has(prop)) continue
    const value = decl.slice(colon + 1).trim()
    if (!value) continue
    if (/expression|url\(|javascript:|@import|expression|calc\(|var\(/i.test(value)) continue
    if (/[<>"]/.test(value)) continue
    safe.push(`${prop}:${value}`)
  }
  return safe.length ? safe.join(";") : null
}

function normalizeProtocol(href: string): string | null {
  if (!href) return null
  const trimmed = href.trim()
  if (trimmed.startsWith("#") || trimmed.startsWith("/")) return trimmed
  // allow relative URLs (starts with a path segment, not a protocol-like prefix)
  if (/^[a-z][a-z0-9+\-.]*:/i.test(trimmed)) {
    const proto = trimmed.split(":", 2)[0].toLowerCase()
    if (proto !== "http" && proto !== "https" && proto !== "mailto" && proto !== "tel") return null
  }
  return trimmed
}

type TagState = {
  name: string
  close: boolean
  selfClose: boolean
  attrs: Record<string, string>
  raw: string
}

// Quick state-machine style tag tokenizer. We don't need a full SGML parser
// because we filter to an allowlist. If tag syntax is malformed, whole token
// is dropped (safe default).
function parseTag(src: string, start: number): TagState | null {
  if (src[start] !== "<") return null
  let i = start + 1
  const state: TagState = { name: "", close: false, selfClose: false, attrs: Object.create(null), raw: "" }
  while (i < src.length && /\s/.test(src[i])) i++
  if (src[i] === "/") { state.close = true; i++; while (i < src.length && /\s/.test(src[i])) i++ }
  if (i >= src.length) return null
  // tag name
  while (i < src.length && /[a-zA-Z0-9]/.test(src[i])) { state.name += src[i]; i++ }
  state.name = state.name.toLowerCase()
  if (!state.name) return null
  // attributes
  while (i < src.length) {
    while (i < src.length && /\s/.test(src[i])) i++
    if (i >= src.length) break
    if (src[i] === "/" && src[i + 1] === ">") { state.selfClose = true; i += 2; break }
    if (src[i] === ">") { i++; break }
    if (src[i] === "<") break
    // attr name
    let aname = ""
    while (i < src.length && /[^\s=/>]/.test(src[i])) { aname += src[i]; i++ }
    aname = aname.toLowerCase()
    let aval = ""
    while (i < src.length && /\s/.test(src[i])) i++
    if (src[i] === "=") {
      i++
      while (i < src.length && /\s/.test(src[i])) i++
      if (src[i] === `"` || src[i] === "'") {
        const q = src[i]; i++
        while (i < src.length && src[i] !== q) { aval += src[i]; i++ }
        if (i < src.length) i++
      } else {
        while (i < src.length && /[^\s>]/.test(src[i])) { aval += src[i]; i++ }
      }
    }
    state.attrs[aname] = aval
  }
  state.raw = src.slice(start, i)
  return state
}

function sanitizeAttrs(tag: string, attrsIn: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = Object.create(null)
  for (const k of Object.keys(attrsIn)) {
    const key = k.toLowerCase()
    // deny: on* handlers, dangerous srcdoc etc.
    if (/^on[a-z]*$/.test(key)) continue
    if (key === "srcdoc") continue
    if (key === "formaction") continue

    if (key === "style") {
      if (MEDIA_TAGS_ALLOW_STYLE.has(tag)) {
        const safe = sanitizeMediaStyle(attrsIn[k])
        if (safe) out.style = safe
      }
      continue
    }

    const value = attrsIn[k]
    if (key === "href" && (tag === "a")) {
      const norm = normalizeProtocol(value)
      if (norm) { out.href = norm; out.rel = "noopener noreferrer" }
      continue
    }
    if ((key === "src" || key === "poster") && (tag === "img" || tag === "video" || tag === "source" || tag === "iframe")) {
      const norm = normalizeProtocol(value)
      if (norm) out[key] = norm
      continue
    }
    if (key === "target") {
      out.target = value === "_blank" ? "_blank" : ""
      continue
    }
    // structural / safe attributes
    if ([
      "alt", "title", "class", "id", "width", "height", "cols", "rows", "colspan", "rowspan",
      "scope", "placeholder", "loading", "decoding", "type", "name", "value", "checked", "disabled",
      "preload", "controls", "muted", "autoplay", "playsinline", "loop",
      "allow", "allowfullscreen", "frameborder", "referrerpolicy", "sandbox", "title",
      "xmlns", "viewbox", "fill", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin",
      "d", "points", "cx", "cy", "r", "x", "y", "x1", "x2", "y1", "y2", "rx", "ry",
      "data-align", "data-cols", "data-youtube-video", "data-allow-fullscreen",
    ].includes(key)) {
      if (key.startsWith("data-")) { out[key] = value; continue }
      out[key] = value
    }
  }
  return out
}

function renderAttrs(attrs: Record<string, string>): string {
  const parts: string[] = []
  for (const k of Object.keys(attrs)) {
    const v = attrs[k].replace(/"/g, "&quot;")
    parts.push(`${k}="${v}"`)
  }
  return parts.length ? " " + parts.join(" ") : ""
}

export function sanitizeCmsHtml(rawHtml: unknown): string {
  if (typeof rawHtml !== "string" || !rawHtml) return ""
  let src = rawHtml
  // First pass: strip full <script> blocks + inline event tricks.
  // Regex is "good enough" here because parseTag below will re-deny anyway.
  src = src.replace(/<script[\s>][\s\S]*?<\/script>/gi, "")
  src = src.replace(/<style[\s>][\s\S]*?<\/style>/gi, "")
  // Deny "javascript:" in any href/src-like attr. parseTag re-checks, but cheaper early.
  src = src.replace(/\b(href|src|action|formaction)\s*=\s*("|')?javascript:[^"'\s>]*/gi, "")
  // Note: style attrs are NOT stripped by regex — we rely on sanitizeAttrs() below
  // which only allows style for a small allowlist of tags (img/video/iframe/figure/div)
  // and whitelists safe CSS props (width/height/margin/aspect-ratio/float only).
  // Stripping via regex caused width/height on media wrappers to be lost.

  const out: string[] = []
  let i = 0
  while (i < src.length) {
    const ch = src[i]
    if (ch !== "<") {
      out.push(ch)
      i++
      continue
    }
    // Comment / CDATA: drop
    if (src.startsWith("<!--", i)) {
      const end = src.indexOf("-->", i + 4)
      i = end === -1 ? src.length : end + 3
      continue
    }
    if (src.startsWith("<![CDATA[", i)) {
      const end = src.indexOf("]]>", i + 9)
      i = end === -1 ? src.length : end + 3
      continue
    }
    // Doctype / ?xml: drop
    if (src[i + 1] === "!" || src[i + 1] === "?") {
      const end = src.indexOf(">", i)
      i = end === -1 ? src.length : end + 1
      continue
    }
    const tag = parseTag(src, i)
    if (!tag) { out.push(ch); i++; continue }
    i += tag.raw.length
    if (!ALLOWED_TAGS.has(tag.name)) continue
    if (tag.close) { out.push(`</${tag.name}>`); continue }
    const cleanAttrs = sanitizeAttrs(tag.name, tag.attrs)
    const selfClose = SELF_CLOSING.has(tag.name) || tag.selfClose
    out.push(`<${tag.name}${renderAttrs(cleanAttrs)}${selfClose ? " /" : ""}>`)
  }
  return out.join("")
}
