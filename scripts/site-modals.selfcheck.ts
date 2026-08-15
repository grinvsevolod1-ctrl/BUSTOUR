/**
 * Site lead modals (Figma Modal_* frames).
 * Captcha: Google reCAPTCHA v3 via ModalCaptchaRow + executeRecaptchaV3.
 */
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { isLeadSubmitEnabled } from "../lib/lead"
import { TOURVISOR_WIDGET_HINT } from "../lib/tourvisor-widget"

const dir = path.join(import.meta.dirname, "../components/site/modals")
for (const file of [
  "site-modal-shell.tsx",
  "modal-tour-order.tsx",
  "modal-bus-order.tsx",
  "modal-testimonial.tsx",
  "index.ts",
]) {
  assert.ok(fs.existsSync(path.join(dir, file)), `missing ${file}`)
}
assert.ok(!fs.existsSync(path.join(dir, "modal-callback.tsx")), "dead ModalCallback removed")
const indexSrc = fs.readFileSync(path.join(dir, "index.ts"), "utf8")
assert.ok(!indexSrc.includes("ModalCallback"), "index must not export ModalCallback")

const shell = fs.readFileSync(path.join(dir, "site-modal-shell.tsx"), "utf8")
assert.ok(shell.includes("bg-brand"), "yellow header")
assert.ok(shell.includes("ModalCaptchaRow"), "captcha row")
assert.ok(shell.includes("grecaptcha"), "recaptcha widget")
assert.ok(shell.includes("executeRecaptchaV3"), "v3 execute helper")
assert.ok(shell.includes("Капча:"), "captcha status copy")
assert.ok(!shell.includes("Введите символы, изображенные на картинке"), "no image-captcha placeholder")
assert.ok(!shell.includes("Подтвердите, что вы не робот"), "no v2 checkbox label")
assert.match(shell, /100dvh/, "dialog max-h uses dvh")
assert.match(shell, /min-h-0/, "dialog can shrink for scroll")
assert.match(shell, /overscroll-contain/, "overscroll contain")
assert.match(shell, /safe-area-inset/, "safe area insets")
assert.match(shell, /modalFormClass/, "shared dense form class")
assert.match(shell, /py-3/, "compact header padding")

const tour = fs.readFileSync(path.join(dir, "modal-tour-order.tsx"), "utf8")
assert.ok(tour.includes("Заказать тур"))
assert.ok(tour.includes("Название тура") || tour.includes("productLabel"))
assert.ok(tour.includes("captchaToken"))
assert.match(tour, /modalFormClass/, "tour order uses dense form")
assert.match(tour, /sm:grid-cols-2/, "tour order two-column on sm+")

const bus = fs.readFileSync(path.join(dir, "modal-bus-order.tsx"), "utf8")
assert.ok(bus.includes("max-w-[684px]"))
assert.ok(bus.includes("Заказать аренду автобуса"))
assert.ok(bus.includes("captchaToken"))
assert.match(bus, /hidden space-y-3 sm:block/, "bus trip fields desktop-only")
assert.match(bus, /isCompactBusForm|min-width: 640px/, "mobile compact submit path")
assert.match(bus, /Мобильная заявка/, "mobile lead message note")
assert.ok(bus.includes("busTitle"), "bus context in lead.tour")

const rev = fs.readFileSync(path.join(dir, "modal-testimonial.tsx"), "utf8")
assert.ok(rev.includes("Оставить отзыв"))
assert.ok(rev.includes("Прикрепить фото или видео"))
assert.ok(rev.includes("обязательные поля"), "leave-review modal must explain * = required")
assert.ok(rev.includes("captchaToken") || rev.includes("captcha"))
assert.ok(rev.includes("submitPublicReview"), "testimonial submits review not lead")
assert.ok(!rev.includes("submitLead"), "testimonial no longer stubs as contact lead")
assert.ok(rev.includes('type="checkbox"'), "consent checkbox")
assert.match(rev, /после проверки модератором/i)
assert.ok(!rev.includes("Страна отдыха"), "simplified: no country")
assert.ok(!rev.includes("Дата поездки"), "simplified: no trip date")

const provider = fs.readFileSync(
  path.join(import.meta.dirname, "../components/site/callback-modal.tsx"),
  "utf8",
)
assert.ok(provider.includes("LeadForm"), "callback uses previous LeadForm modal")
assert.match(provider, /100dvh/, "float callback modal fits viewport")
assert.match(provider, /min-h-0/, "float callback can shrink/scroll")
assert.match(provider, /overscroll-contain/, "float callback overscroll")

const leadForm = fs.readFileSync(
  path.join(import.meta.dirname, "../components/site/lead-form.tsx"),
  "utf8",
)
assert.ok(leadForm.includes('type="checkbox"'), "consent checkbox")
assert.ok(leadForm.includes("/legal/privacy"), "privacy link")
assert.ok(leadForm.includes("isLeadSubmitEnabled"), "uses shared submit-enabled helper")
assert.ok(leadForm.includes("ModalCaptchaRow"), "lead form captcha row")
assert.ok(
  /disabled=\{!isLeadSubmitEnabled\(consent, status/.test(leadForm),
  "submit disabled via isLeadSubmitEnabled(consent, status, …)",
)

assert.equal(isLeadSubmitEnabled(false, "idle"), false)
assert.equal(isLeadSubmitEnabled(true, "idle"), true)
assert.equal(isLeadSubmitEnabled(true, "sending"), false)
assert.equal(isLeadSubmitEnabled(false, "sending"), false)
assert.equal(isLeadSubmitEnabled(true, "idle", false), false)
assert.equal(isLeadSubmitEnabled(true, "idle", true), true)

const pageSettings = fs.readFileSync(
  path.join(import.meta.dirname, "../components/admin/page-settings-form.tsx"),
  "utf8",
)
assert.ok(pageSettings.includes("Виджет"), "Tourvisor widget button")
assert.ok(pageSettings.includes("TOURVISOR_WIDGET_HINT"), "widget hint constant")
assert.match(pageSettings, /title=\{TOURVISOR_WIDGET_HINT\}/, "widget link title tooltip")

assert.match(TOURVISOR_WIDGET_HINT, /Tourvisor/i)
assert.match(TOURVISOR_WIDGET_HINT, /поиск|виджет|редактор/i)

const busBtn = fs.readFileSync(
  path.join(import.meta.dirname, "../components/site/bus-order-button.tsx"),
  "utf8",
)
assert.ok(busBtn.includes("ModalBusOrder"), "bus order wired")

const booking = fs.readFileSync(
  path.join(import.meta.dirname, "../components/site/booking-form.tsx"),
  "utf8",
)
assert.ok(booking.includes("ModalTourOrder"), "tour order wired in booking form")

const dates = fs.readFileSync(
  path.join(import.meta.dirname, "../components/site/dates-table.tsx"),
  "utf8",
)
assert.ok(dates.includes("ModalTourOrder"), "tour order wired in dates table")
assert.ok(!dates.includes("useCallbackModal"), "dates table no longer opens callback for booking")

const transfer = fs.readFileSync(
  path.join(import.meta.dirname, "../components/site/transfer-schedule-table.tsx"),
  "utf8",
)
assert.ok(transfer.includes("ModalTourOrder"), "transfer schedule booking opens modal")
assert.ok(!/href=\{row\.bookingHref/.test(transfer), "transfer booking not a bookingHref link")

const testimonials = fs.readFileSync(
  path.join(import.meta.dirname, "../components/site/testimonial-button.tsx"),
  "utf8",
)
assert.ok(testimonials.includes("ModalTestimonial"), "testimonial modal wired")

const reviewsPage = fs.readFileSync(
  path.join(import.meta.dirname, "../app/(site)/testimonials/page.tsx"),
  "utf8",
)
assert.ok(reviewsPage.includes("TestimonialButton"), "reviews page uses TestimonialButton")

console.log("site-modals.selfcheck: ok")
