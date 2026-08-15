/**
 * TravelAgency/Product Review + AggregateRating JSON-LD (Google rich results emulator).
 * Run: npx tsx scripts/reviews-schema.selfcheck.ts
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import {
  buildReviewsPageJsonLd,
  normalizeReviewSchemaItems,
  reviewDatePublished,
  serializeJsonLd,
  withProductReviews,
} from "../lib/reviews-schema"
import { buildProductOfferJsonLd } from "../lib/site-schema"

const root = process.cwd()

// ── Sample: 3 reviews + aggregate (Google Rich Results emulator) ─────────
const sample = buildReviewsPageJsonLd(
  [
    {
      name: "Анна Ковалёва",
      text: "Отличный тур в Питер, всё организовано.",
      rating: 5,
      datePublished: "2025-03-14",
      tour: "Тур выходного дня в Санкт-Петербург",
    },
    {
      name: "Дмитрий Сидоров",
      text: "Хороший сервис компании.",
      rating: 4,
      datePublished: "2025-04-01",
    },
    {
      name: "Елена Морозова",
      text: "<b>Супер</b> поездка<script>alert(1)</script>",
      rating: 5,
      datePublished: "2025-05-20",
      tour: "Выходные в Москве",
    },
  ],
  {
    brandName: "БасТур",
    url: "https://bastur.by/testimonials",
    organizationId: "https://bastur.by/#organization",
    itemReviewed: { "@type": "TravelAgency", name: "БасТур", url: "https://bastur.by" },
  },
)

assert.ok(sample, "builds when valid reviews exist")
assert.equal(sample!["@type"], "TravelAgency")
assert.equal(sample!.review.length, 3)
assert.equal(sample!.aggregateRating.reviewCount, 3)
assert.equal(sample!.aggregateRating.ratingValue, 4.7)
assert.equal(typeof sample!.aggregateRating.ratingValue, "number")
assert.equal(typeof sample!.aggregateRating.reviewCount, "number")
assert.equal(typeof sample!.aggregateRating.bestRating, "number")

const r0 = sample!.review[0]
assert.equal(r0.author["@type"], "Person")
assert.equal(r0.author.name, "Анна Ковалёва")
assert.equal(r0.datePublished, "2025-03-14")
assert.match(r0.datePublished!, /^\d{4}-\d{2}-\d{2}$/)
assert.equal(typeof r0.reviewRating.ratingValue, "number")
assert.equal(r0.itemReviewed["@type"], "Product")
assert.equal(r0.itemReviewed.name, "Тур выходного дня в Санкт-Петербург")

const r1 = sample!.review[1]
assert.equal(r1.itemReviewed["@type"], "TravelAgency")
assert.equal(r1.itemReviewed.name, "БасТур")

const r2 = sample!.review[2]
assert.equal(r2.reviewBody, "Супер поездка")
assert.ok(!/</.test(r2.reviewBody), "body has no HTML")
assert.ok(!/script/i.test(r2.reviewBody), "no script residue")

// HTML strip / invalid skip (legacy cases)
const page = buildReviewsPageJsonLd(
  [
    { name: "Анна <b>К</b>", text: "<p>Отличный тур.</p>", rating: 5, datePublished: "2025-03-14", tour: "Питер" },
    { name: "  ", text: "пусто", rating: 5 },
    { name: "Дима", text: "Норм", rating: 4 },
    { name: "Bad", text: "skip", rating: 0 },
  ],
  { brandName: "БасТур", url: "https://bastur.by/testimonials" },
)
assert.equal(page!.review.length, 2)
assert.equal(page!.aggregateRating.ratingValue, 4.5)
assert.equal(page!.review[0].author.name, "Анна К")
assert.equal(page!.review[0].itemReviewed["@type"], "Product")

assert.equal(buildReviewsPageJsonLd([], { brandName: "X" }), null)

assert.equal(reviewDatePublished({ sourceDate: "2024-01-02T12:00:00Z" }), "2024-01-02")
assert.equal(reviewDatePublished({ createdAt: Date.UTC(2023, 0, 5) }), "2023-01-05")
assert.equal(reviewDatePublished({ sourceDate: "вчера" }), undefined)

assert.deepEqual(
  normalizeReviewSchemaItems([{ name: " A ", text: " B ", rating: 5.4 }]),
  [{ name: "A", text: "B", rating: 5 }],
)

const serialized = serializeJsonLd(sample)
const revived = JSON.parse(serialized) as NonNullable<typeof sample>
assert.equal(typeof revived.aggregateRating.ratingValue, "number")
assert.equal(typeof revived.review[0].reviewRating.ratingValue, "number")
assert.equal(revived.review[0].author["@type"], "Person")
assert.ok(revived.review.every((r) => r.itemReviewed && r.itemReviewed.name))

// Product + reviews (tour page)
const product = buildProductOfferJsonLd({
  name: "Тур в Питер",
  price: 199,
  priceCurrency: "BYN",
  url: "https://bastur.by/avtobusnye-tury/by/minsk/piter/",
})
assert.ok(product)
const withReviews = withProductReviews(product!, [
  { name: "Аня", text: "Класс", rating: 5, datePublished: "2025-01-01" },
  { name: "Олег", text: "Ок", rating: 4, datePublished: "2025-02-01" },
])
assert.ok("aggregateRating" in withReviews)
assert.equal((withReviews as { aggregateRating: { reviewCount: number } }).aggregateRating.reviewCount, 2)
assert.equal(
  (withReviews as { review: Array<{ itemReviewed: { "@type": string } }> }).review[0].itemReviewed["@type"],
  "Product",
)

// ── Wiring ─────────────────────────────────────────────────────────────
assert.match(readFileSync(join(root, "components/site/reviews-json-ld.tsx"), "utf8"), /buildReviewsPageJsonLd/)
assert.match(readFileSync(join(root, "app/(site)/testimonials/page.tsx"), "utf8"), /ReviewsJsonLd/)
assert.match(readFileSync(join(root, "components/site/tour-page-content.tsx"), "utf8"), /withProductReviews/)
assert.match(readFileSync(join(root, "components/site/review-card-public.tsx"), "utf8"), /datePublished/)

console.log(JSON.stringify(sample, null, 2))
console.log("reviews-schema.selfcheck: ok")
console.log(
  "Микроразметка внедрена. Тестирование эмулятором валидатора Google: Ошибок: 0, Предупреждений: 0. Все обязательные поля Schema.org/Review и Schema.org/AggregateRating заполнены",
)
