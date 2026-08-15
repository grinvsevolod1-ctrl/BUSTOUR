/**
 * Shared site schema.org builders + public wiring.
 * Run: npx tsx scripts/site-schema.selfcheck.ts
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import {
  absoluteUrl,
  buildArticleJsonLd,
  buildProductOfferJsonLd,
  buildTravelAgencyJsonLd,
  buildWebSiteJsonLd,
  organizationId,
  serializeJsonLd,
} from "../lib/site-schema"
import type { SiteSettings } from "../lib/types"

const root = process.cwd()

const settings: SiteSettings = {
  "site.brand": "БасТур <b>x</b>",
  "site.url": "https://bastur.by",
  "site.address": "ул. Примерная 1",
  "social.links": JSON.stringify([
    { id: "ig", label: "IG", url: "https://instagram.com/bastur", enabled: true },
    { id: "bad", label: "X", url: "not-a-url", enabled: true },
  ]),
}

// ── Helpers ────────────────────────────────────────────────────────────
assert.equal(organizationId("https://bastur.by"), "https://bastur.by/#organization")
assert.equal(organizationId("https://bastur.by/"), "https://bastur.by/#organization")
assert.equal(absoluteUrl("https://bastur.by", "/info/a"), "https://bastur.by/info/a")
assert.equal(absoluteUrl("https://bastur.by/", "https://cdn/x.jpg"), "https://cdn/x.jpg")
assert.equal(absoluteUrl("https://bastur.by", ""), undefined)

// ── TravelAgency ───────────────────────────────────────────────────────
const org = buildTravelAgencyJsonLd(settings, {
  phone: "+375291112233",
  email: "info@bastur.by",
})
assert.equal(org["@type"], "TravelAgency")
assert.equal(org["@id"], "https://bastur.by/#organization")
assert.equal(org.url, "https://bastur.by")
assert.equal(org.name, "БасТур x")
assert.equal(org.telephone, "+375291112233")
assert.equal(org.email, "info@bastur.by")
assert.equal(org.logo, "https://bastur.by/figma/logomark.svg")
assert.deepEqual(org.sameAs, ["https://instagram.com/bastur"])
assert.equal(org.address?.streetAddress, "ул. Примерная 1")
assert.equal(org.address?.addressCountry, "BY")
assert.ok(org.openingHoursSpecification?.length)
assert.equal(org.openingHoursSpecification[0]["@type"], "OpeningHoursSpecification")
assert.deepEqual(org.openingHoursSpecification[0].dayOfWeek, [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
])
assert.equal(org.openingHoursSpecification[0].opens, "10:00")
assert.equal(org.openingHoursSpecification[0].closes, "18:00")
assert.equal("openingHours" in org, false)

const orgJson = serializeJsonLd(org)
assert.ok(!orgJson.includes("<") || orgJson.includes("\\u003c"), "safe serialize")
assert.match(orgJson, /bastur\.by\/#organization/)
assert.match(orgJson, /OpeningHoursSpecification/)

// ── WebSite (no SearchAction — Tourvisor is not a first-party search URL) ─
const site = buildWebSiteJsonLd(settings)
assert.equal(site["@type"], "WebSite")
assert.equal(site.url, "https://bastur.by")
assert.equal(site.publisher["@id"], "https://bastur.by/#organization")
assert.equal(site.name, "БасТур x")
assert.equal("potentialAction" in site, false)

// ── Article ────────────────────────────────────────────────────────────
const article = buildArticleJsonLd({
  origin: "https://bastur.by",
  brandName: "БасТур",
  title: "Новость <em>1</em>",
  description: "<p>Текст</p>",
  image: "/uploads/a.jpg",
  date: "2026-07-01",
  urlPath: "/info/novosti/news-1",
})
assert.ok(article)
assert.equal(article!["@type"], "Article")
assert.equal(article!.headline, "Новость 1")
assert.equal(article!.description, "Текст")
assert.equal(article!.url, "https://bastur.by/info/novosti/news-1")
assert.equal(article!.datePublished, "2026-07-01")
assert.equal(article!.publisher["@id"], "https://bastur.by/#organization")
assert.equal(buildArticleJsonLd({ origin: "https://x.by", brandName: "X", title: "  ", urlPath: "/a" }), null)

// ── Product ────────────────────────────────────────────────────────────
const product = buildProductOfferJsonLd({
  name: "Тур <b>A</b>",
  description: "<p>Описание</p>",
  image: "https://bastur.by/t.jpg",
  url: "https://bastur.by/t/",
  category: "Автобусные туры",
  brandName: "БасТур",
  price: "199.50 BYN",
  priceCurrency: "BYN",
})
assert.ok(product)
assert.equal(product!["@type"], "Product")
assert.equal(product!.name, "Тур A")
assert.equal(product!.offers.price, "199.5")
assert.equal(product!.offers.priceCurrency, "BYN")
assert.equal(product!.brand?.name, "БасТур")

// ── Wiring ─────────────────────────────────────────────────────────────
const layout = readFileSync(join(root, "app/(site)/layout.tsx"), "utf8")
assert.match(layout, /buildTravelAgencyJsonLd/)
assert.match(layout, /serializeJsonLd/)

const home = readFileSync(join(root, "app/(site)/page.tsx"), "utf8")
assert.match(home, /buildWebSiteJsonLd/)
assert.match(home, /application\/ld\+json/)

const articlePage = readFileSync(join(root, "app/(site)/info/article-page.tsx"), "utf8")
assert.match(articlePage, /buildArticleJsonLd/)
assert.match(articlePage, /articleUrl/)

const busPage = readFileSync(join(root, "app/(site)/bus-rental/[slug]/page.tsx"), "utf8")
assert.match(busPage, /metadataFromSettings|Breadcrumb/)
assert.doesNotMatch(busPage, /NEXT_PUBLIC_SITE_URL/)
assert.doesNotMatch(busPage, /buildProductOfferJsonLd/, "bus rental has no price — no Product Offer")
assert.doesNotMatch(busPage, /application\/ld\+json/)

const tourPage = readFileSync(join(root, "components/site/tour-page-content.tsx"), "utf8")
assert.match(tourPage, /buildProductOfferJsonLd/)
assert.match(tourPage, /serializeJsonLd/)

const reviewsLd = readFileSync(join(root, "components/site/reviews-json-ld.tsx"), "utf8")
assert.match(reviewsLd, /organizationId/)

const crumb = readFileSync(join(root, "components/site/breadcrumb.tsx"), "utf8")
assert.match(crumb, /serializeJsonLd/)
assert.match(crumb, /getSiteOrigin/)

console.log("ok")
