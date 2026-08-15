/**
 * #91 — video upload MIME path + VIDEO display on /testimonials + contacts player.
 * Run: npx tsx scripts/video-display.selfcheck.ts
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { resolveUploadContentType } from "../lib/media-utils"
import {
  fallbackThumbnail,
  getEmbedUrl,
  isDirectVideoUrl,
  mediaPathname,
} from "../lib/video-url"

const root = process.cwd()
const read = (p: string) => readFileSync(join(root, p), "utf8")

// --- URL helpers (Blob + local) ---
assert.equal(mediaPathname("/uploads/a.mp4?x=1"), "/uploads/a.mp4")
assert.equal(
  mediaPathname("https://x.public.blob.vercel-storage.com/uploads/u.mp4#t=0"),
  "https://x.public.blob.vercel-storage.com/uploads/u.mp4",
)

assert.equal(isDirectVideoUrl("/uploads/clip.mp4"), true)
assert.equal(
  isDirectVideoUrl("https://x.public.blob.vercel-storage.com/uploads/clip.webm?download=1"),
  true,
)
assert.equal(isDirectVideoUrl("/uploads/photo.jpg"), false)

assert.equal(getEmbedUrl("/uploads/v.mp4"), "/uploads/v.mp4")
assert.equal(
  getEmbedUrl("https://xyz.public.blob.vercel-storage.com/uploads/uuid.mp4"),
  "https://xyz.public.blob.vercel-storage.com/uploads/uuid.mp4",
)
assert.equal(
  getEmbedUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ"),
  "https://www.youtube.com/embed/dQw4w9WgXcQ?rel=0&autoplay=1",
)
assert.equal(
  getEmbedUrl("https://vimeo.com/123456789"),
  "https://player.vimeo.com/video/123456789?autoplay=1",
)
assert.equal(getEmbedUrl("/uploads/photo.png"), null)
assert.equal(
  fallbackThumbnail("https://youtu.be/dQw4w9WgXcQ"),
  "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
)

// --- Content-Type for Blob (empty / octet-stream must not stay blank) ---
assert.equal(resolveUploadContentType("a.mp4", "", "video"), "video/mp4")
assert.equal(resolveUploadContentType("a.mp4", "application/octet-stream", "video"), "video/mp4")
assert.equal(resolveUploadContentType("a.webm", "video/webm", "video"), "video/webm")
assert.equal(resolveUploadContentType("a.png", "", "image"), "image/png")
assert.equal(resolveUploadContentType("a.png", "image/png", "image"), "image/png")

const mediaService = read("lib/media-service.ts")
assert.match(
  mediaService,
  /resolveUploadContentType/,
  "saveFile must set Blob/local Content-Type from helper",
)

// --- /testimonials: VIDEO via unified ReviewCardPublic; homepage keeps VideoCard ---
const reviewsSection = read("components/site/reviews-section.tsx")
const videoCard = read("components/site/video-card.tsx")
const publicCard = read("components/site/review-card-public.tsx")
assert.doesNotMatch(reviewsSection, /VideoCard/, "testimonials grid uses ReviewCardPublic only")
assert.match(reviewsSection, /ReviewCardPublic/)
assert.match(publicCard, /isVideoReview|ReviewVideoPlayer/, "public card plays VIDEO")
assert.doesNotMatch(videoCard, /line-clamp-/, "#91: homepage VideoCard must not line-clamp")
assert.match(videoCard, /getEmbedUrl/)
assert.ok(videoCard.includes("lib/video-url"), "VideoCard uses shared video-url helpers")

const testimonials = read("components/site/testimonials.tsx")
assert.ok(testimonials.includes("components/site/video-card"), "homepage imports VideoCard")
assert.match(testimonials, /VideoCard/)

// --- Contacts route video ---
const contacts = read("app/(site)/contacts/page.tsx")
assert.match(contacts, /ClickToPlayVideo/)
assert.match(contacts, /site\.routeVideo/)
assert.match(read("components/site/click-to-play-video.tsx"), /video/)

console.log("video-display.selfcheck: ok")
