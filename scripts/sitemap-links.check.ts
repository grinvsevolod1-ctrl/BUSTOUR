/**
 * Sitemap link monitor — fetches /sitemap.xml from a running instance and
 * verifies every URL responds 200 (после переезда/деплоя ловит битые ссылки).
 *
 * Run against local server:   npx tsx scripts/sitemap-links.check.ts
 * Run against production:     BASE_URL=https://bastur.by npx tsx scripts/sitemap-links.check.ts
 * Cron (ежедневно, 6:00):     0 6 * * * cd /var/www/bastur && BASE_URL=https://bastur.by npx tsx scripts/sitemap-links.check.ts >> logs/link-monitor.log 2>&1
 *
 * Exit code 1 если найдены битые URL — удобно для алертов.
 */

const BASE_URL = (process.env.BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "")
const CONCURRENCY = Number(process.env.LINK_CHECK_CONCURRENCY || 8)
const TIMEOUT_MS = 15_000

type LinkResult = { url: string; status: number | string }

function extractLocs(xml: string): string[] {
  const locs: string[] = []
  const re = /<loc>([^<]+)<\/loc>/g
  let match: RegExpExecArray | null
  while ((match = re.exec(xml)) !== null) locs.push(match[1].trim())
  return locs
}

/** Sitemap URLs point to the canonical origin; test the instance we were given. */
function toLocalUrl(url: string): string {
  try {
    const parsed = new URL(url)
    return `${BASE_URL}${parsed.pathname}${parsed.search}`
  } catch {
    return url
  }
}

async function checkUrl(url: string): Promise<LinkResult> {
  try {
    const res = await fetch(toLocalUrl(url), {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { "User-Agent": "bastur-link-monitor/1.0" },
    })
    return { url, status: res.status }
  } catch (err) {
    return { url, status: err instanceof Error ? err.name : "fetch failed" }
  }
}

async function main() {
  const sitemapUrl = `${BASE_URL}/sitemap.xml`
  console.log(`sitemap-links: fetching ${sitemapUrl}`)
  const res = await fetch(sitemapUrl, { signal: AbortSignal.timeout(TIMEOUT_MS) })
  if (!res.ok) {
    console.error(`sitemap-links: sitemap.xml responded ${res.status}`)
    process.exit(1)
  }
  const urls = extractLocs(await res.text())
  console.log(`sitemap-links: ${urls.length} URLs to check (concurrency ${CONCURRENCY})`)

  const broken: LinkResult[] = []
  let checked = 0
  const queue = [...urls]
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (queue.length) {
        const url = queue.shift()
        if (!url) break
        const result = await checkUrl(url)
        checked++
        if (result.status !== 200) broken.push(result)
      }
    }),
  )

  console.log(`sitemap-links: checked ${checked}, broken ${broken.length}`)
  if (broken.length) {
    for (const { url, status } of broken) console.error(`  BROKEN [${status}] ${url}`)
    process.exit(1)
  }
  console.log("sitemap-links: OK — все ссылки отвечают 200")
}

main().catch((err) => {
  console.error("sitemap-links: fatal", err)
  process.exit(1)
})
