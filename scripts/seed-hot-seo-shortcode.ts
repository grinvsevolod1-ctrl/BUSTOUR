/**
 * Back-compat: seed hot.seoTitle with [Y]. Prefer seed-page-seo-shortcode.ts.
 * Run: npx tsx scripts/seed-hot-seo-shortcode.ts
 */
process.env.SEO_PREFIX = process.env.SEO_PREFIX || "hot"
await import("./seed-page-seo-shortcode")
