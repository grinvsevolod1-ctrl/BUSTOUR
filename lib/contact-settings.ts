import type { SiteSettings } from "@/lib/types"

export type DisplayPhone = {
  label: string
  href: string
}

/** Public contact emails — reject typos like `user@gmail.com1`. */
const CONTACT_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/

export function isValidContactEmail(value: string): boolean {
  return CONTACT_EMAIL_RE.test(value.trim())
}

export function telHref(phone: string): string {
  const raw = phone.replace(/[^+\d]/g, "")
  return raw ? `tel:${raw}` : ""
}

function splitPhones(value?: string): string[] {
  return (value || "")
    .split(/\r?\n/)
    .map((phone) => phone.trim())
    .filter(Boolean)
}

export function splitContactValues(value?: string): string[] {
  return (value || "").split(/\r?\n/).map((item) => item.trim()).filter(Boolean)
}

/** Emails for contacts page / mailto — skips invalid CMS junk. */
export function getDisplayEmails(settings: SiteSettings): string[] {
  const raw = splitContactValues(settings["site.emails"] || settings["site.email"])
  return raw.filter(isValidContactEmail)
}

/** First usable email for schema.org / fallbacks. */
export function getPrimaryEmail(settings: SiteSettings): string | null {
  return getDisplayEmails(settings)[0] ?? null
}

export function getDisplayPhones(settings: SiteSettings): DisplayPhone[] {
  const footerPhones = splitPhones(settings["site.phones"])
  const headerPhone = (settings["site.phone"] || "").trim()
  const labels = footerPhones.length ? footerPhones : headerPhone ? [headerPhone] : []

  return labels.map((label) => ({
    label,
    href: telHref(label),
  }))
}

export function getPrimaryPhone(settings: SiteSettings): DisplayPhone | null {
  return getDisplayPhones(settings)[0] ?? null
}

/** Short office hours for UI (callback modal, header). Seed/fallback `10:00–18:00`. */
export function getOfficeHoursLabel(settings: SiteSettings): string {
  const raw = (settings["site.hours"] || "").trim()
  return raw || "10:00–18:00"
}

export function getEmergencyPhone(settings: SiteSettings): DisplayPhone | null {
  const label = (settings["site.emergencyPhone"] || "").trim()
  return label ? { label, href: telHref(label) } : null
}