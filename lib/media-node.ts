export type MediaNode = {
  url: string
  mediaId?: string
  customAlt?: string
}

function trimOrUndef(value: unknown): string | undefined {
  if (value == null) return undefined
  const text = String(value).trim()
  return text || undefined
}

/** Coerce legacy URL string or JSON MediaNode into MediaNode. */
export function coerceMediaNode(raw: unknown): MediaNode | null {
  if (raw == null) return null
  if (typeof raw === "string") {
    const text = raw.trim()
    if (!text) return null
    if (text.startsWith("{")) {
      try {
        return coerceMediaNode(JSON.parse(text) as unknown)
      } catch {
        return { url: text }
      }
    }
    return { url: text }
  }
  if (typeof raw !== "object") return null
  const record = raw as Record<string, unknown>
  const url = trimOrUndef(record.url)
  if (!url) return null
  const mediaId = trimOrUndef(record.mediaId)
  const customAlt = trimOrUndef(record.customAlt)
  return {
    url,
    ...(mediaId ? { mediaId } : {}),
    ...(customAlt ? { customAlt } : {}),
  }
}

export function coerceMediaNodeList(raw: unknown): MediaNode[] {
  let value: unknown = raw
  if (typeof raw === "string") {
    const text = raw.trim()
    if (!text) return []
    try {
      value = JSON.parse(text) as unknown
    } catch {
      return []
    }
  }
  if (!Array.isArray(value)) return []
  return value.map(coerceMediaNode).filter((node): node is MediaNode => node != null)
}

/** Bare URL when no extras — keeps legacy DB rows readable. */
export function serializeMediaNode(node: MediaNode): string {
  if (!node.mediaId && !node.customAlt) return node.url
  return JSON.stringify({
    url: node.url,
    ...(node.mediaId ? { mediaId: node.mediaId } : {}),
    ...(node.customAlt ? { customAlt: node.customAlt } : {}),
  })
}

export function serializeMediaNodeList(nodes: MediaNode[]): string {
  return JSON.stringify(
    nodes.map((node) => ({
      url: node.url,
      ...(node.mediaId ? { mediaId: node.mediaId } : {}),
      ...(node.customAlt ? { customAlt: node.customAlt } : {}),
    })),
  )
}

export function resolveImageAlt(parts: {
  customAlt?: string | null
  defaultAlt?: string | null
  entityTitle?: string | null
}): string {
  return (
    parts.customAlt?.trim() ||
    parts.defaultAlt?.trim() ||
    parts.entityTitle?.trim() ||
    ""
  )
}

/** Empty customAlt field: show library default as placeholder hint. */
export function instanceAltPlaceholder(defaultAlt?: string | null): string {
  const alt = defaultAlt?.trim()
  return alt ? `пусто = ${alt}` : "пусто"
}

export function collectMediaIds(nodes: MediaNode[]): string[] {
  const ids = new Set<string>()
  for (const node of nodes) {
    if (node.mediaId) ids.add(node.mediaId)
  }
  return [...ids]
}

export function buildGallerySlides(
  nodes: MediaNode[],
  defaultAlts: Map<string, string>,
  entityTitle: string,
): { url: string; alt: string }[] {
  return nodes.map((node) => ({
    url: node.url,
    alt: resolveImageAlt({
      customAlt: node.customAlt,
      defaultAlt: node.mediaId ? defaultAlts.get(node.mediaId) : undefined,
      entityTitle,
    }),
  }))
}

/** Persist only real library UUID ids as mediaId. */
export function isMediaLibraryId(id: string | undefined | null): boolean {
  if (!id) return false
  return !id.includes("/") && !id.startsWith("blob:")
}

