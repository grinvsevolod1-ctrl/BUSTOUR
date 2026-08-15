import type { MetadataRoute } from "next"
import { CANONICAL_ORIGIN } from "@/lib/canonical-origin"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/admin/"],
    },
    // Single source of truth — normalized protocol, no trailing slash.
    sitemap: `${CANONICAL_ORIGIN}/sitemap.xml`,
  }
}
