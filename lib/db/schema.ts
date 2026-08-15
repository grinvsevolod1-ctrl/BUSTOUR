import {
  bigint,
  boolean,
  check,
  index,
  integer,
  pgTable,
  real,
  serial,
  text,
  uniqueIndex,
} from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

const createdAt = (name: string) => bigint(name, { mode: "number" }).notNull()

export const tours = pgTable("tours", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  price: text("price").notNull(),
  priceAmount: real("priceAmount").notNull().default(0),
  extraPriceAmount: real("extraPriceAmount").notNull().default(0),
  extraPriceCurrency: text("extraPriceCurrency").notNull().default(""),
  image: text("image").notNull(),
  category: text("category").notNull().default("bus"),
  tourType: text("tourType").notNull().default(""),
  duration: text("duration").notNull().default(""),
  departure: text("departure").notNull().default("Минск"),
  country: text("country").notNull().default(""),
  countryId: integer("countryId").notNull().references(() => countries.id, { onDelete: "no action" }),
  arrivalCityId: integer("arrivalCityId").notNull().references(() => cityDestinations.id, { onDelete: "no action" }),
  nights: integer("nights").notNull().default(0),
  featured: boolean("featured").notNull().default(false),
  program: text("program").notNull().default("[]"),
  included: text("included").notNull().default("[]"),
  excluded: text("excluded").notNull().default("[]"),
  whatIncluded: text("whatIncluded").notNull().default("[]"),
  seoHtml: text("seoHtml").notNull().default(""),
  seoTitle: text("seoTitle").notNull().default(""),
  alertText: text("alertText").notNull().default(""),
  alertType: text("alertType").notNull().default("info"),
  gallery: text("gallery").notNull().default("[]"),
  datesTable: text("datesTable").notNull().default("{}"),
  datesNote: text("datesNote").notNull().default(""),
  datesNoteType: text("datesNoteType").notNull().default("info"),
  datesCurrency: text("datesCurrency").notNull().default("BYN"),
  datesFootnotes: text("datesFootnotes"),
  documents: text("documents").notNull().default("[]"),
  layout: text("layout").notNull().default("[]"),
  archived: boolean("archived").notNull().default(false),
  sortOrder: integer("sortOrder").notNull().default(0),
  createdAt: createdAt("createdAt"),
}, (table) => ({
  archivedIdx: index("tours_archived_idx").on(table.archived),
  archivedCategoryIdx: index("tours_archived_category_idx").on(table.archived, table.category),
  archivedFeaturedIdx: index("tours_archived_featured_idx").on(table.archived, table.featured),
  countryIdIdx: index("tours_country_id_idx").on(table.countryId),
  arrivalCityIdIdx: index("tours_arrival_city_id_idx").on(table.arrivalCityId),
  sortOrderIdx: index("tours_sort_order_idx").on(table.sortOrder),
  toursPriceAmountNonNeg: check("tours_price_amount_nonneg", sql`${table.priceAmount} >= 0`),
  toursExtraPriceAmountNonNeg: check("tours_extra_price_amount_nonneg", sql`${table.extraPriceAmount} >= 0`),
  toursNightsNonNeg: check("tours_nights_nonneg", sql`${table.nights} >= 0`),
  toursCategoryEnum: check("tours_category_enum", sql`${table.category} IN ('bus','avia','hot')`),
}))

export const buses = pgTable("buses", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  image: text("image").notNull().default(""),
  gallery: text("gallery").notNull().default("[]"),
  year: text("year").notNull().default(""),
  seats: text("seats").notNull().default(""),
  busClass: text("busClass").notNull().default(""),
  phone: text("phone").notNull().default(""),
  documents: text("documents").notNull().default("[]"),
  seating: text("seating").notNull().default("[]"),
  sortOrder: integer("sortOrder").notNull().default(0),
  archived: boolean("archived").notNull().default(false),
  createdAt: createdAt("createdAt"),
}, (table) => ({
  archivedIdx: index("buses_archived_idx").on(table.archived),
}))

export const transfers = pgTable(
  "transfers",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull(),
    category: text("category").notNull().default("airport"),
    title: text("title").notNull(),
    intro: text("intro").notNull().default(""),
    priceRoundTrip: real("priceRoundTrip").notNull().default(0),
    priceOneWay: real("priceOneWay").notNull().default(0),
    image: text("image").notNull().default(""),
    sortOrder: integer("sortOrder").notNull().default(0),
    archived: boolean("archived").notNull().default(false),
    createdAt: createdAt("createdAt"),
  },
  (t) => [
    uniqueIndex("transfers_category_slug").on(t.category, t.slug),
    check("transfers_price_roundtrip_nonneg", sql`${t.priceRoundTrip} >= 0`),
    check("transfers_price_oneway_nonneg", sql`${t.priceOneWay} >= 0`),
    check("transfers_category_enum", sql`${t.category} IN ('airport','railway','bus_station','city')`),
  ],
)

export const transferSchedules = pgTable(
  "transfer_schedules",
  {
    id: serial("id").primaryKey(),
    transferId: integer("transferId").notNull().references(() => transfers.id, { onDelete: "cascade" }),
    direction: text("direction").notNull().default("outbound"),
    departureTime: text("departureTime").notNull().default(""),
    arrival: text("arrival").notNull().default(""),
    note: text("note").notNull().default(""),
    bookingHref: text("bookingHref").notNull().default(""),
    sortOrder: integer("sortOrder").notNull().default(0),
    createdAt: createdAt("createdAt"),
  },
  (t) => [index("transfer_schedules_transfer_id_idx").on(t.transferId)],
)

export const tourDates = pgTable(
  "tour_dates",
  {
    id: serial("id").primaryKey(),
    tourId: integer("tourId").notNull().references(() => tours.id, { onDelete: "cascade" }),
    startDate: text("startDate").notNull().default(""),
    endDate: text("endDate").notNull().default(""),
    description: text("description").notNull().default(""),
    extraPriceAmount: real("extraPriceAmount").notNull().default(0),
    extraPriceCurrency: text("extraPriceCurrency").notNull().default(""),
    sortOrder: integer("sortOrder").notNull().default(0),
    createdAt: createdAt("createdAt"),
  },
  (t) => [
    index("tour_dates_tour_id_idx").on(t.tourId),
    check("tour_dates_end_after_start", sql`${t.endDate} >= ${t.startDate}`),
    check("tour_dates_extra_price_nonneg", sql`${t.extraPriceAmount} >= 0`),
  ],
)

export const tourDateTags = pgTable(
  "tour_date_tags",
  {
    id: serial("id").primaryKey(),
    dateId: integer("dateId").notNull().references(() => tourDates.id, { onDelete: "cascade" }),
    icon: text("icon").notNull().default("flag"),
    label: text("label").notNull().default(""),
    sortOrder: integer("sortOrder").notNull().default(0),
  },
  (t) => [index("tour_date_tags_date_id_idx").on(t.dateId)],
)

export const tourDateRooms = pgTable(
  "tour_date_rooms",
  {
    id: serial("id").primaryKey(),
    dateId: integer("dateId").notNull().references(() => tourDates.id, { onDelete: "cascade" }),
    name: text("name").notNull().default(""),
    price: real("price").notNull().default(0),
    discount: integer("discount").notNull().default(0),
    sortOrder: integer("sortOrder").notNull().default(0),
  },
  (t) => [
    index("tour_date_rooms_date_id_idx").on(t.dateId),
    check("tour_date_rooms_price_nonneg", sql`${t.price} >= 0`),
    check("tour_date_rooms_discount_range", sql`${t.discount} >= 0 AND ${t.discount} <= 100`),
  ],
)

export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  type: text("type").notNull().default("TEXT"),
  name: text("name").notNull(),
  tour: text("tour").notNull().default(""),
  text: text("text").notNull(),
  rating: integer("rating").notNull().default(5),
  source: text("source").notNull().default("manual"),
  sourceId: text("sourceId").notNull().default(""),
  sourceDate: text("sourceDate").notNull().default(""),
  approved: boolean("approved").notNull().default(false),
  showOn: text("showOn").notNull().default("[]"),
  videoUrl: text("videoUrl").notNull().default(""),
  thumbnailUrl: text("thumbnailUrl").notNull().default(""),
  archived: boolean("archived").notNull().default(false),
  createdAt: createdAt("createdAt"),
}, (table) => ({
  archivedIdx: index("reviews_archived_idx").on(table.archived),
  archivedApprovedIdx: index("reviews_archived_approved_idx").on(table.archived, table.approved),
  reviewsRatingRange: check("reviews_rating_range", sql`${table.rating} >= 1 AND ${table.rating} <= 5`),
}))

export const articles = pgTable("articles", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  category: text("category").notNull().default("news"),
  excerpt: text("excerpt").notNull(),
  image: text("image").notNull(),
  date: text("date").notNull().default(""),
  content: text("content").notNull().default("[]"),
  contentHtml: text("contentHtml").notNull().default(""),
  metaTitle: text("metaTitle").notNull().default(""),
  metaDescription: text("metaDescription").notNull().default(""),
  metaShortDesc: text("metaShortDesc").notNull().default(""),
  metaImage: text("metaImage").notNull().default(""),
  metaImageAlt: text("metaImageAlt").notNull().default(""),
  archived: boolean("archived").notNull().default(false),
  createdAt: createdAt("createdAt"),
}, (table) => ({
  archivedIdx: index("articles_archived_idx").on(table.archived),
  articlesCategoryEnum: check("articles_category_enum", sql`${table.category} IN ('news','special','reviews')`),
}))

export const leads = pgTable(
  "leads",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    phone: text("phone").notNull(),
    email: text("email"),
    message: text("message"),
    type: text("type").notNull().default("contact"),
    tour: text("tour"),
    status: text("status").notNull().default("new"),
    archived: boolean("archived").notNull().default(false),
    createdAt: createdAt("createdAt"),
  },
  (t) => [index("leads_archived_idx").on(t.archived)],
)

export const admins = pgTable("admins", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("passwordHash").notNull(),
  role: text("role").notNull().default("admin"),
  active: boolean("active").notNull().default(true),
  createdAt: createdAt("createdAt"),
})

export const adminRoles = pgTable("admin_roles", {
  slug: text("slug").primaryKey(),
  label: text("label").notNull(),
  isSystem: boolean("isSystem").notNull().default(false),
  hidden: boolean("hidden").notNull().default(false),
  createdAt: createdAt("createdAt"),
})

export const adminAuditLog = pgTable(
  "admin_audit_log",
  {
    id: serial("id").primaryKey(),
    adminId: integer("adminId").references(() => admins.id, { onDelete: "set null" }),
    username: text("username").notNull().default(""),
    action: text("action").notNull(),
    entityType: text("entityType").notNull().default(""),
    entityId: text("entityId").notNull().default(""),
    summary: text("summary").notNull().default(""),
    beforeJson: text("beforeJson").notNull().default(""),
    afterJson: text("afterJson").notNull().default(""),
    metaJson: text("metaJson").notNull().default(""),
    createdAt: createdAt("createdAt"),
  },
  (t) => [
    index("admin_audit_log_admin_created_idx").on(t.adminId, t.createdAt),
    index("admin_audit_log_entity_idx").on(t.entityType, t.entityId),
  ],
)

export const cityDestinations = pgTable(
  "city_destinations",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    category: text("category").notNull().default("bus"),
    country: text("country").notNull(),
    countryId: integer("countryId").notNull().references(() => countries.id),
    intro: text("intro").notNull().default(""),
    sections: text("sections").notNull().default("[]"),
    seoHtml: text("seoHtml").notNull().default(""),
    sortOrder: integer("sortOrder").notNull().default(0),
    archived: boolean("archived").notNull().default(false),
    createdAt: createdAt("createdAt"),
  },
  (t) => [
    uniqueIndex("city_destinations_category_slug").on(t.category, t.slug),
    index("city_destinations_archived_idx").on(t.archived),
    index("city_destinations_category_archived_idx").on(t.category, t.archived),
    check("city_destinations_category_enum", sql`${t.category} IN ('bus','avia','hot')`),
  ],
)

export const countries = pgTable(
  "countries",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    category: text("category").notNull().default("bus"),
    intro: text("intro").notNull().default(""),
    seoHtml: text("seoHtml").notNull().default(""),
    sortOrder: integer("sortOrder").notNull().default(0),
    archived: boolean("archived").notNull().default(false),
    createdAt: createdAt("createdAt"),
  },
  (t) => [
    uniqueIndex("countries_category_slug").on(t.category, t.slug),
    index("countries_archived_idx").on(t.archived),
    check("countries_category_enum", sql`${t.category} IN ('bus','avia','hot')`),
  ],
)

export const currencies = pgTable("currencies", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  label: text("label").notNull().default(""),
  symbol: text("symbol").notNull().default(""),
  rate: real("rate").notNull().default(1),
  isBase: boolean("isBase").notNull().default(false),
  sortOrder: integer("sortOrder").notNull().default(0),
  createdAt: createdAt("createdAt"),
}, (t) => [
  check("currencies_rate_positive", sql`${t.rate} > 0`),
])

export const busTourTypes = pgTable("bus_tour_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  sortOrder: integer("sortOrder").notNull().default(0),
  createdAt: createdAt("createdAt"),
})

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull().default(""),
})

export const mediaFolders = pgTable("media_folders", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  createdAt: createdAt("created_at"),
})

export const mediaFiles = pgTable("media_files", {
  id: text("id").primaryKey(),
  url: text("url").notNull(),
  name: text("name").notNull(),
  size: text("size").notNull(),
  type: text("type").notNull(),
  checksum: text("checksum").notNull().default(""),
  altText: text("alt_text"),
  folderId: text("folder_id").references(() => mediaFolders.id, { onDelete: "set null" }),
  status: text("status").notNull().default("ready"),
  processingStage: text("processing_stage").notNull().default("ready"),
  errorMessage: text("error_message"),
  mimeType: text("mime_type").notNull().default(""),
  sourceUrl: text("source_url"),
  leaseUntil: bigint("lease_until", { mode: "number" }),
  updatedAt: createdAt("updated_at"),
  processedAt: bigint("processed_at", { mode: "number" }),
  createdAt: createdAt("created_at"),
}, (table) => ({
  checksumIdx: index("media_files_checksum_idx").on(table.checksum),
  folderIdx: index("media_files_folder_id_idx").on(table.folderId),
  statusIdx: index("media_files_status_idx").on(table.status),
  leaseIdx: index("media_files_lease_until_idx").on(table.leaseUntil),
}))

export const certSections = pgTable("cert_sections", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  sortOrder: integer("sortOrder").notNull().default(0),
  createdAt: createdAt("createdAt"),
})

export const certificates = pgTable(
  "certificates",
  {
    id: serial("id").primaryKey(),
    sectionId: integer("sectionId").notNull().references(() => certSections.id, { onDelete: "no action" }),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    image: text("image").notNull().default(""),
    sortOrder: integer("sortOrder").notNull().default(0),
    createdAt: createdAt("createdAt"),
  },
  (t) => [index("certificates_section_id_idx").on(t.sectionId)],
)

export const staff = pgTable("staff", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  position: text("position").notNull().default(""),
  email: text("email").notNull().default(""),
  phone: text("phone").notNull().default(""),
  photo: text("photo").notNull().default(""),
  sortOrder: integer("sortOrder").notNull().default(0),
  archived: boolean("archived").notNull().default(false),
  createdAt: createdAt("createdAt"),
}, (table) => ({
  archivedIdx: index("staff_archived_idx").on(table.archived),
}))

export const contentBlocks = pgTable(
  "content_blocks",
  {
    id: serial("id").primaryKey(),
    collection: text("collection").notNull(),
    page: text("page").notNull().default("global"),
    title: text("title").notNull().default(""),
    subtitle: text("subtitle").notNull().default(""),
    body: text("body").notNull().default(""),
    image: text("image").notNull().default(""),
    icon: text("icon").notNull().default(""),
    href: text("href").notNull().default(""),
    extra: text("extra").notNull().default("{}"),
    sortOrder: integer("sortOrder").notNull().default(0),
    visible: boolean("visible").notNull().default(true),
    createdAt: createdAt("createdAt"),
  },
  (t) => [index("content_blocks_collection_page_idx").on(t.collection, t.page)],
)

export const shortcodes = pgTable("shortcodes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  value: text("value").notNull().default(""),
  description: text("description"),
})
