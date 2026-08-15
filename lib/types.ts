export type IncludedMarker = "check" | "dot" | "cross" | "star" | "dash"

export type { MediaNode } from "@/lib/media/node"
import type { MediaNode } from "@/lib/media/node"

export type IncludedGroup = {
  title: string
  marker: IncludedMarker
  items: string[]
}

// Alert / message tone shared by the page alert and the dates-table note.
export type AlertKind = "info" | "warning"

export type TourAlert = { text: string; type: AlertKind }

// A short labelled tag with an icon shown above the tour description
// (e.g. "На День России").
export type DatesTableTag = { icon: string; label: string }

// A bookable room option for a dates row. Final price is derived from
// `price` and `discount` (percent, 0 = no discount).
export type DatesTableRoom = { id?: number; name: string; price: number; discount: number }

// One row of the "Даты и цены" table.
export type DatesTableRow = {
  id?: number
  startDate: string
  endDate: string
  description: string
  extraPriceAmount?: number
  extraPriceCurrency?: string
  tags: DatesTableTag[]
  rooms: DatesTableRoom[]
}

// Editable "Даты и цены" table: structured rows (dates, description, rooms)
// plus an optional note rendered as an alert above the table.
// `footnotes` — lines under desktop table / inside mobile cards (`{currency}` → code).
export type DatesTable = {
  note: string
  noteType: AlertKind
  currency: string
  footnotes: string[]
  rows: DatesTableRow[]
}

export type TourDocument = { title: string; href: string; size: string }

// Configurable sections of the tour page whose order/visibility (and, for
// anchored ones, label) are controlled per tour from the admin.
export type TourSectionKey =
  | "dates"
  | "callus"
  | "program"
  | "included"
  | "gallery"
  | "seo"
  | "documents"
  | "faq"
  | "reviews"

export type TourSection = { key: TourSectionKey; label: string; visible: boolean }

export type Tour = {
  id: number
  slug: string
  title: string
  description: string
  price: string
  priceAmount: number
  extraPriceAmount: number
  extraPriceCurrency: string
  datesCurrency: string
  image: string
  tourType: string
  duration: string
  departure: string
  country: string
  countryId: number
  countrySlug: string
  arrivalCityId: number
  citySlug: string
  nights: number
  featured: boolean
  sortOrder: number
  program: { day: string; text: string; dayStart?: number; dayEnd?: number }[]
  included: string[]
  excluded: string[]
  whatIncluded: IncludedGroup[]
  seoHtml: string
  seoTitle: string
  alertText: string
  alertType: AlertKind
  /** Cover binding (url + optional mediaId/customAlt). `image` mirrors cover.url. */
  cover: MediaNode
  gallery: MediaNode[]
  datesTable: DatesTable
  documents: TourDocument[]
  layout: TourSection[]
  archived: boolean
}

export type Bus = {
  id: number
  slug: string
  title: string
  image: string
  cover: MediaNode
  gallery: MediaNode[]
  year: string
  seats: string
  busClass: string
  phone: string
  documents: TourDocument[]
  /** Посадочная схема (PDF/файлы), отдельно от общих документов. */
  seating: TourDocument[]
  sortOrder: number
  archived: boolean
}

export type TransferCategory = "airport" | "individual"
export type TransferDirection = "outbound" | "return"

export type Transfer = {
  id: number
  slug: string
  category: TransferCategory
  title: string
  intro: string
  priceRoundTrip: number
  priceOneWay: number
  image: string
  sortOrder: number
  archived: boolean
}

export type TransferSchedule = {
  id?: number
  transferId: number
  direction: TransferDirection
  departureTime: string
  arrival: string
  note: string
  bookingHref: string
  sortOrder: number
}

export type Review = {
  id: number
  type: "TEXT" | "VIDEO"
  name: string
  tour: string
  text: string
  rating: number
  source: "manual" | "holiday_by"
  sourceId: string
  sourceDate: string
  approved: boolean
  showOn: string[]
  videoUrl: string
  thumbnailUrl: string
  archived: boolean
  createdAt: number
  /** Admin-only: decrypted / legacy contact phone for site-submitted reviews. */
  contactPhone?: string
}

export const ARTICLE_CATEGORIES = ["news", "special", "reviews"] as const
export type ArticleCategory = (typeof ARTICLE_CATEGORIES)[number]
export const ARTICLE_CATEGORY_LABELS: Record<ArticleCategory, string> = {
  news: "Новости",
  special: "Спецпредложения",
  reviews: "Обзоры туров",
}

export function isArticleCategory(value: string): value is ArticleCategory {
  return (ARTICLE_CATEGORIES as readonly string[]).includes(value)
}

export type Article = {
  id: number
  slug: string
  title: string
  category: ArticleCategory
  excerpt: string
  image: string
  date: string
  content: string[]
  contentHtml: string
  metaTitle: string
  metaDescription: string
  metaShortDesc: string
  metaImage: string
  metaImageAlt: string
  archived: boolean
}

export type BlockCollection =
  | "hero"
  | "advantage"
  | "faq"
  | "stat"
  | "principle"
  | "fleet"
  | "direction"
  | "resort"

export type ContentBlock = {
  id: number
  collection: BlockCollection
  page: string
  title: string
  subtitle: string
  body: string
  image: string
  icon: string
  href: string
  extra: Record<string, unknown>
  sortOrder: number
  visible: boolean
}

// Cities are scoped to a single tour category (bus | avia | hot).
export type CityCategory = "bus" | "avia" | "hot"

export type CityDestination = {
  id: number
  slug: string
  name: string
  category: CityCategory
  country: string
  countryId: number
  intro: string
  sections: { title: string; body: string[] }[]
  seoHtml: string
  sortOrder: number
  archived: boolean
}

export type Country = {
  id: number
  slug: string
  name: string
  /** "bus" | "avia" | "hot" — separates bus-tour countries from aviation countries and hot deals. */
  category: "bus" | "avia" | "hot"
  intro: string
  seoHtml: string
  sortOrder: number
  archived: boolean
}

export type Currency = {
  id: number
  code: string
  label: string
  symbol: string
  rate: number
  isBase: boolean
  sortOrder: number
}

export type BusTourType = {
  id: number
  name: string
  sortOrder: number
}

export type SiteSettings = Record<string, string>

export type StaffMember = {
  id: number
  name: string
  position: string
  email: string
  phone: string
  photo: string
  sortOrder: number
  archived: boolean
  createdAt: number
}

// Licenses & certificates page
export type CertSection = {
  id: number
  title: string
  sortOrder: number
  createdAt: number
}

export type Certificate = {
  id: number
  sectionId: number
  name: string
  description: string
  image: string
  sortOrder: number
  createdAt: number
}

export type CertSectionWithItems = CertSection & { items: Certificate[] }

export type LeadType = "callback" | "booking" | "contact" | "rentbus"
export type LeadStatus = "new" | "in_progress" | "done"

export type Lead = {
  id: number
  name: string
  phone: string
  email: string | null
  message: string | null
  type: LeadType
  tour: string | null
  status: LeadStatus
  archived: boolean
  createdAt: number
}
