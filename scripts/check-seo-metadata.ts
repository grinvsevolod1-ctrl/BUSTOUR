import assert from "node:assert/strict"
import { metadataFromSettings } from "@/lib/seo-metadata"

async function main() {
  const metadata = await metadataFromSettings(
    {
      "tour:7.metaTitle": "Тур по Европе",
      "tour:7.metaDescription": "Описание тура",
      "tour:7.metaImage": "/images/tour.jpg",
    },
    "tour:7",
    "Fallback",
    "Fallback description",
    { imageAlt: "Тур по Европе" },
  )

  assert.equal(metadata.title, "Тур по Европе")
  assert.equal(metadata.description, "Описание тура")
  assert.deepEqual(metadata.openGraph?.images, [{ url: "/images/tour.jpg", alt: "Тур по Европе" }])
  console.log("seo metadata self-check: ok")
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
