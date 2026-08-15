import path from "node:path"
import { eq } from "drizzle-orm"
import { migrate as migratePg } from "drizzle-orm/node-postgres/migrator"
import { client, db, readyClient } from "./index"
import {
  admins,
  adminRoles,
  articles,
  buses,
  busTourTypes,
  certSections,
  certificates,
  cityDestinations,
  contentBlocks,
  countries,
  currencies,
  leads,
  reviews,
  settings,
  shortcodes,
  staff,
  tourDateRooms,
  tourDates,
  tourDateTags,
  tours,
  transfers,
} from "./schema"
import { seedTours, seedReviews, seedArticles } from "./seed-data"
import { defaultSettings, defaultBlocks } from "./cms-seed"
import { seedCities } from "./cities-seed"
import { hashPassword } from "../password"
import { parseLegacyDateRange } from "../dates-table"
import { getBustourDeployEnv } from "../deploy-env"

function parsePriceAmount(price: string): number {
  const digits = String(price).replace(/\D/g, "")
  const n = Number.parseInt(digits, 10)
  return Number.isFinite(n) ? n : 0
}

const seedCurrencies = [
  { code: "BYN", label: "Белорусский рубль", symbol: "Br", rate: 1, isBase: true },
  { code: "USD", label: "Доллар США", symbol: "$", rate: 0.3, isBase: false },
  { code: "EUR", label: "Евро", symbol: "€", rate: 0.28, isBase: false },
  { code: "RUB", label: "Российский рубль", symbol: "₽", rate: 27, isBase: false },
  { code: "PLN", label: "Польский злотый", symbol: "zł", rate: 1.2, isBase: false },
]

const seedBusTourTypes = [
  "ЖД туры",
  "Отдых на море",
  "Трансфер (проезд)",
  "Отдых на море + экскурсии",
  "Экскурсионный тур",
]

const translitMap: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i",
  й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t",
  у: "u", ф: "f", х: "h", ц: "c", ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "",
  э: "e", ю: "yu", я: "ya",
}

function slugifyCountry(name: string): string {
  const s = name
    .toLowerCase()
    .split("")
    .map((ch) => translitMap[ch] ?? ch)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
  return s || `country-${Date.now()}`
}

async function applyMigrations() {
  await readyClient()
  await migratePg(db, { migrationsFolder: path.join(process.cwd(), "drizzle") })
}

async function seedAdminRoleCatalog() {
  const now = Date.now()
  const rows = [
    { slug: "superadmin", label: "Суперадмин" },
    { slug: "admin", label: "Админ" },
    { slug: "manager", label: "Менеджер" },
  ] as const

  for (const row of rows) {
    await db
      .insert(adminRoles)
      .values({
        slug: row.slug,
        label: row.label,
        isSystem: true,
        hidden: false,
        createdAt: now,
      })
      .onConflictDoNothing()
  }
}

async function seedBuiltinShortcodes() {
  const year = String(new Date().getFullYear())
  await db
    .insert(shortcodes)
    .values({ name: "Y", value: year, description: "Текущий год" })
    .onConflictDoUpdate({
      target: shortcodes.name,
      set: { value: year },
    })
}

/**
 * Dev/local-only test accounts. NEVER runs on production:
 * hardcoded credentials would be a backdoor, and the forced
 * password reset would override real admin changes.
 */
async function seedExtraAdmins() {
  if (getBustourDeployEnv() === "production") return

  const now = Date.now()
  const extras = [
    { username: "test", password: "testtest", role: "admin" },
    { username: "admin2", password: "admin123", role: "superadmin" },
    { username: "manager", password: "manager123", role: "manager" },
    { username: "superadmin", password: "superadmin123", role: "superadmin" },
  ] as const

  for (const item of extras) {
    const [existing] = await db
      .select({ id: admins.id })
      .from(admins)
      .where(eq(admins.username, item.username))
      .limit(1)

    if (existing) continue

    await db.insert(admins).values({
      username: item.username,
      passwordHash: hashPassword(item.password),
      role: item.role,
      active: true,
      createdAt: now,
    })
  }
}

async function seedSettingsDefaults() {
  const existingRows = await db.select().from(settings)
  const existingKeys = new Set(existingRows.map((row) => row.key))
  const missing = Object.entries(defaultSettings)
    .filter(([key]) => !existingKeys.has(key))
    .map(([key, value]) => ({ key, value }))

  if (missing.length) {
    await db.insert(settings).values(missing).onConflictDoNothing()
  }
}

async function seedContentBlocks() {
  const blockCount = await db.$count(contentBlocks)
  if (blockCount > 0) return

  const now = Date.now()
  await db.insert(contentBlocks).values(
    defaultBlocks.map((block, index) => ({
      collection: block.collection,
      page: "global",
      title: block.title ?? "",
      subtitle: block.subtitle ?? "",
      body: block.body ?? "",
      image: block.image ?? "",
      icon: block.icon ?? "",
      href: block.href ?? "",
      extra: JSON.stringify(block.extra ?? {}),
      sortOrder: index,
      visible: block.visible ?? true,
      createdAt: now - index * 1000,
    })),
  )
}

async function seedCatalog() {
  const now = Date.now()
  const seededCountryPairs = Array.from(
    new Map(
      [
        ...seedTours.map((tour) => ({ name: tour.country, category: "bus" as const })),
        ...seedCities.map((city) => ({ name: city.country, category: city.category })),
      ].map(({ name, category }) => [`${name.trim().toLowerCase()}:${category}`, { name: name.trim(), category }]),
    ).values(),
  )

  if (await db.$count(countries) === 0 && seededCountryPairs.length) {
    await db.insert(countries).values(
      seededCountryPairs.map(({ name, category }, index) => ({
        slug: slugifyCountry(name),
        name,
        category,
        sortOrder: index,
        createdAt: now - index * 1000,
      })),
    )
  }

  const countryRows = await db
    .select({ id: countries.id, name: countries.name, category: countries.category })
    .from(countries)
  const countryByName = new Map(countryRows.map((country) => [country.name.trim().toLowerCase(), country.id]))
  const countryByNameCategory = new Map(
    countryRows.map((country) => [`${country.name.trim().toLowerCase()}:${country.category}`, country.id]),
  )

  // Fail fast instead of inserting a dangling FK (0 never exists in countries).
  function resolveCountryId(name: string, category: string): number {
    const key = name.trim().toLowerCase()
    const id = countryByNameCategory.get(`${key}:${category}`) ?? countryByName.get(key)
    if (!id) {
      throw new Error(`seed: country "${name}" (${category}) not found — cannot link countryId`)
    }
    return id
  }

  if (await db.$count(cityDestinations) === 0) {
    await db.insert(cityDestinations).values(
      seedCities.map((city, index) => ({
        slug: city.slug,
        name: city.name,
        category: city.category,
        country: city.country,
        countryId: resolveCountryId(city.country, city.category),
        intro: city.intro,
        sections: JSON.stringify(city.sections),
        seoHtml: "",
        sortOrder: index,
        archived: false,
        createdAt: now - index * 1000,
      })),
    )
  }

  const cityRows = await db
    .select({
      id: cityDestinations.id,
      country: cityDestinations.country,
      category: cityDestinations.category,
    })
    .from(cityDestinations)
  const busCityByCountry = new Map<string, number>()
  for (const row of cityRows) {
    if (row.category !== "bus") continue
    const key = row.country.trim().toLowerCase()
    if (!busCityByCountry.has(key)) busCityByCountry.set(key, row.id)
  }
  const fallbackBusCityId = cityRows.find((row) => row.category === "bus")?.id
  if (!fallbackBusCityId) {
    throw new Error("seed: no bus city_destinations; cannot insert tours with required arrivalCityId")
  }

  if (await db.$count(tours) === 0) {
    await db.insert(tours).values(
      seedTours.map((tour, index) => ({
        slug: tour.slug,
        title: tour.title,
        description: tour.description,
        price: tour.price,
        priceAmount: parsePriceAmount(tour.price),
        extraPriceAmount: 0,
        extraPriceCurrency: "",
        image: tour.image,
        category: tour.category,
        tourType: "",
        duration: tour.duration,
        departure: tour.departure,
        country: tour.country,
        countryId: resolveCountryId(tour.country, tour.category),
        arrivalCityId: busCityByCountry.get(tour.country.trim().toLowerCase()) ?? fallbackBusCityId,
        nights: tour.nights,
        featured: tour.featured,
        program: JSON.stringify(tour.program),
        included: JSON.stringify(tour.included),
        excluded: JSON.stringify(tour.excluded),
        whatIncluded: "[]",
        seoHtml: "",
        seoTitle: "",
        alertText: "",
        alertType: "info",
        gallery: "[]",
        datesTable: tour.datesTable ? JSON.stringify(tour.datesTable) : "{}",
        datesNote: String(tour.datesTable?.note ?? ""),
        datesNoteType: String(tour.datesTable?.noteType ?? "info"),
        datesCurrency: String(tour.datesTable?.currency ?? "BYN"),
        datesFootnotes: null,
        documents: "[]",
        layout: "[]",
        archived: false,
        sortOrder: index,
        createdAt: now - index * 1000,
      })),
    )
  }

  const seededToursRows = await db
    .select({ id: tours.id, slug: tours.slug })
    .from(tours)
  const tourIdBySlug = new Map(seededToursRows.map((row) => [row.slug, row.id]))
  const existingDateCount = await db.$count(tourDates)
  if (existingDateCount === 0) {
    for (const tour of seedTours) {
      const tourId = tourIdBySlug.get(tour.slug)
      if (!tourId || !tour.datesTable?.rows?.length) continue
      for (let rowIndex = 0; rowIndex < tour.datesTable.rows.length; rowIndex += 1) {
        const raw = tour.datesTable.rows[rowIndex] as Record<string, unknown>
        const range = parseLegacyDateRange(String(raw.dates ?? ""))
        if (!range.startDate || !range.endDate) continue
        const [inserted] = await db
          .insert(tourDates)
          .values({
            tourId,
            startDate: range.startDate,
            endDate: range.endDate,
            description: String(raw?.description ?? "").trim(),
            extraPriceAmount: 0,
            extraPriceCurrency: "",
            sortOrder: rowIndex,
            createdAt: now + rowIndex,
          })
          .returning({ id: tourDates.id })

        if (!inserted) continue

        const tags = Array.isArray(raw?.tags) ? raw.tags : []
        for (let tagIndex = 0; tagIndex < tags.length; tagIndex += 1) {
          const tag = tags[tagIndex] as Record<string, unknown>
          await db.insert(tourDateTags).values({
            dateId: inserted.id,
            icon: String(tag.icon ?? "flag"),
            label: String(tag.label ?? ""),
            sortOrder: tagIndex,
          })
        }

        const rooms = Array.isArray(raw?.rooms) ? raw.rooms : []
        for (let roomIndex = 0; roomIndex < rooms.length; roomIndex += 1) {
          const room = rooms[roomIndex] as Record<string, unknown>
          await db.insert(tourDateRooms).values({
            dateId: inserted.id,
            name: String(room.name ?? ""),
            price: Number(room.price) || 0,
            discount: Math.round(Number(room.discount) || 0),
            sortOrder: roomIndex,
          })
        }
      }
    }
  }

  // Seed-parity: destination pages should behave identical to admin-created + published.
  // Backfill visible/h1/intro/meta/callus settings keys explicitly (no fallbacks) so
  // resolvePublicCmsText sees real values and editors match admin-created records.
  {
    const existingRows = await db.select().from(settings)
    const existing = Object.fromEntries(existingRows.map((row) => [row.key, row.value]))
    const patch: Record<string, string> = {}
    const allCountries = await db.select({ id: countries.id, name: countries.name, slug: countries.slug, category: countries.category }).from(countries)
    for (const c of allCountries) {
      const pageKey = `country:${c.category}:${c.slug}`
      const visKey = `${pageKey}.visible`
      if (existing[visKey] === undefined) patch[visKey] = "1"
      const callusKey = `${pageKey}.section.callus`
      if (existing[callusKey] === undefined) patch[callusKey] = "1"
      const h1Key = `${pageKey}.h1`
      if (existing[h1Key] === undefined) patch[h1Key] = `Туры в ${c.name}`
      const introKey = `${pageKey}.intro`
      if (existing[introKey] === undefined) patch[introKey] = `Подборка актуальных автобусных и авиатур в ${c.name} от турфирмы «Бастур». Проверенные даты, честные цены, отзывы туристов. Звоните или оставляйте заявку — подберём тур для вашей семьи и бюджета.`
      const metaTitleKey = `${pageKey}.metaTitle`
      if (existing[metaTitleKey] === undefined) patch[metaTitleKey] = `Туры в ${c.name} 2026 — цены, отзывы, фото отелей | Бастур`
      const metaDescriptionKey = `${pageKey}.metaDescription`
      if (existing[metaDescriptionKey] === undefined) patch[metaDescriptionKey] = `Отдых в ${c.name}: прямые цены у туроператора, все включено, горящие предложения. Бронируйте онлайн или по телефону.`
    }
    const allCities = await db.select({ id: cityDestinations.id, name: cityDestinations.name, slug: cityDestinations.slug, category: cityDestinations.category, country: cityDestinations.country, intro: cityDestinations.intro }).from(cityDestinations)
    for (const city of allCities) {
      const pageKey = `city:${city.category}:${city.slug}`
      const visKey = `${pageKey}.visible`
      if (existing[visKey] === undefined) patch[visKey] = "1"
      const callusKey = `${pageKey}.section.callus`
      if (existing[callusKey] === undefined) patch[callusKey] = "1"
      const h1Key = `${pageKey}.h1`
      if (existing[h1Key] === undefined) patch[h1Key] = `Отдых в ${city.name}`
      const introKey = `${pageKey}.intro`
      if (existing[introKey] === undefined && String(city.intro ?? "").trim().length >= 12) patch[introKey] = city.intro
      const metaTitleKey = `${pageKey}.metaTitle`
      if (existing[metaTitleKey] === undefined) patch[metaTitleKey] = `Отдых в ${city.name} ${city.country ? `(${city.country})` : ""} 2026 | Бастур`
      const metaDescriptionKey = `${pageKey}.metaDescription`
      if (existing[metaDescriptionKey] === undefined) patch[metaDescriptionKey] = `Курорт ${city.name}: описание, достопримечательности, пляжи, цены на туры и отели 2026.`
    }
    if (Object.keys(patch).length > 0) {
      await db.transaction(async (tx) => {
        for (const [key, value] of Object.entries(patch)) {
          await tx.insert(settings).values({ key, value }).onConflictDoUpdate({ target: settings.key, set: { value } })
        }
      })
    }
  }
}

async function seedReviewsAndArticles() {
  const now = Date.now()
  if (await db.$count(reviews) === 0) {
    await db.insert(reviews).values(
      seedReviews.map((review, index) => ({
        ...review,
        type: "TEXT",
        source: "manual",
        sourceId: "",
        sourceDate: "",
        approved: true,
        showOn: '["home"]',
        videoUrl: "",
        thumbnailUrl: "",
        archived: false,
        createdAt: now - index * 1000,
      })),
    )
  }

  if (await db.$count(articles) === 0) {
    await db.insert(articles).values(
      seedArticles.map((article, index) => ({
        slug: article.slug,
        title: article.title,
        category: "news",
        excerpt: article.excerpt,
        image: article.image,
        date: article.date,
        content: JSON.stringify(article.content),
        contentHtml: "",
        metaTitle: "",
        metaDescription: "",
        metaShortDesc: "",
        metaImage: "",
        metaImageAlt: "",
        archived: false,
        createdAt: now - index * 1000,
      })),
    )
  }
}

async function seedAdminAndLookups() {
  const now = Date.now()

  if (await db.$count(admins) === 0) {
    const username = process.env.ADMIN_USERNAME || "admin"
    const password = process.env.ADMIN_PASSWORD || "admin123"
    await db.insert(admins).values({
      username,
      passwordHash: hashPassword(password),
      role: "admin",
      active: true,
      createdAt: now,
    })
  }

  if (await db.$count(currencies) === 0) {
    await db.insert(currencies).values(
      seedCurrencies.map((currency, index) => ({
        ...currency,
        sortOrder: index,
        createdAt: now - index * 1000,
      })),
    )
  }

  if (await db.$count(busTourTypes) === 0) {
    await db.insert(busTourTypes).values(
      seedBusTourTypes.map((name, index) => ({
        name,
        sortOrder: index,
        createdAt: now - index * 1000,
      })),
    )
  }
}

async function seedOperationalData() {
  const now = Date.now()

  if (await db.$count(buses) === 0) {
    await db.insert(buses).values({
      slug: "neoplan-122",
      title: "Neoplan 122",
      image: "/images/bus.png",
      gallery: "[]",
      year: "2004",
      seats: "73",
      busClass: "Туристический",
      phone: "",
      documents: "[]",
      seating: "[]",
      sortOrder: 0,
      archived: false,
      createdAt: now,
    })
  }

  if (await db.$count(transfers) === 0) {
    await db.insert(transfers).values([
      { slug: "sheremetyevo", category: "airport", title: "Шереметьево", intro: "", priceRoundTrip: 0, priceOneWay: 0, image: "/images/transfers/sheremetyevo.png", sortOrder: 0, archived: false, createdAt: now },
      { slug: "vnukovo", category: "airport", title: "Внуково", intro: "", priceRoundTrip: 0, priceOneWay: 0, image: "/images/transfers/vnukovo.png", sortOrder: 1, archived: false, createdAt: now + 1 },
      { slug: "domodedovo", category: "airport", title: "Домодедово", intro: "", priceRoundTrip: 0, priceOneWay: 0, image: "/images/transfers/domodedovo.png", sortOrder: 2, archived: false, createdAt: now + 2 },
      { slug: "individual", category: "individual", title: "Индивидуальный трансфер", intro: "", priceRoundTrip: 0, priceOneWay: 0, image: "/images/transfers/individual.png", sortOrder: 3, archived: false, createdAt: now + 3 },
    ])
  }

  if (await db.$count(staff) === 0) {
    const seedStaff = [
      { name: "Лозанова Валентина", position: "Директор", email: "v.lozanova@bus-tour.by", phone: "+375 29 685-97-49", photo: "/placeholder-user.jpg" },
      { name: "Петрова Ирина", position: "Менеджер по туризму", email: "i.petrova@bus-tour.by", phone: "+375 29 685-97-50", photo: "/placeholder-user.jpg" },
      { name: "Сидоров Алексей", position: "Главный бухгалтер", email: "a.sidorov@bus-tour.by", phone: "+375 29 685-97-51", photo: "/placeholder-user.jpg" },
      { name: "Кузнецова Наталья", position: "Менеджер по продажам", email: "n.kuznetsova@bus-tour.by", phone: "+375 29 685-97-52", photo: "/placeholder-user.jpg" },
      { name: "Васильев Дмитрий", position: "IT-специалист", email: "d.vasiliev@bus-tour.by", phone: "+375 29 685-97-53", photo: "/placeholder-user.jpg" },
      { name: "Морозова Светлана", position: "Специалист по визам", email: "s.morozova@bus-tour.by", phone: "+375 29 685-97-54", photo: "/placeholder-user.jpg" },
    ]
    await db.insert(staff).values(
      seedStaff.map((item, index) => ({
        ...item,
        sortOrder: index,
        archived: false,
        createdAt: now - index * 1000,
      })),
    )
  }

  if (await db.$count(leads) === 0) {
    await db.insert(leads).values([
      { name: "Александр Козлов", phone: "+375 29 700-11-22", email: "a.kozlov@example.com", message: "Интересует тур в Санкт-Петербург на июль.", type: "booking", tour: "Тур выходного дня в Санкт-Петербург", status: "new", archived: false, createdAt: now },
      { name: "Марина Орлова", phone: "+375 33 612-45-90", email: "m.orlova@example.com", message: "Подберите семейный отдых в Анталии.", type: "callback", tour: "Анталия: семейный отдых AI", status: "in_progress", archived: false, createdAt: now - 1000 },
      { name: "Игорь Смирнов", phone: "+375 29 811-34-56", email: null, message: "Нужна консультация по горящим турам.", type: "contact", tour: "Горящая Хургада — успейте к морю", status: "new", archived: false, createdAt: now - 2000 },
      { name: "Екатерина Левина", phone: "+375 44 534-22-18", email: "e.levina@example.com", message: "Хотим в Карелию осенью, нас четверо.", type: "booking", tour: "Карельские озёра и Рускеала", status: "done", archived: false, createdAt: now - 3000 },
    ])
  }

  if (await db.$count(certSections) === 0) {
    const [licensesSection] = await db
      .insert(certSections)
      .values({ title: "Лицензии и разрешения", sortOrder: 0, createdAt: now })
      .returning({ id: certSections.id })
    const [membershipSection] = await db
      .insert(certSections)
      .values({ title: "Сертификаты и членство", sortOrder: 1, createdAt: now + 1 })
      .returning({ id: certSections.id })

    if (licensesSection) {
      await db.insert(certificates).values([
        { sectionId: licensesSection.id, name: "Лицензия на туроператорскую деятельность", description: "Лицензия Министерства спорта и туризма Республики Беларусь, серия 02040/0247538", image: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=1200&q=80", sortOrder: 0, createdAt: now },
        { sectionId: licensesSection.id, name: "Свидетельство о государственной регистрации", description: "УНП 191560040, зарегистрировано Минским горисполкомом", image: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1200&q=80", sortOrder: 1, createdAt: now + 1 },
      ])
    }

    if (membershipSection) {
      await db.insert(certificates).values([
        { sectionId: membershipSection.id, name: "Членство в «Беларустурист»", description: "Действительный член Республиканского союза туристических организаций «Беларустурист»", image: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=1200&q=80", sortOrder: 0, createdAt: now },
        { sectionId: membershipSection.id, name: "Сертификат качества ISO 9001", description: "Система менеджмента качества туристических услуг", image: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1200&q=80", sortOrder: 1, createdAt: now + 1 },
      ])
    }
  }
}

async function seed() {
  const isProduction = getBustourDeployEnv() === "production"

  // Essential defaults — safe on any environment (all are count===0 / conflict-guarded).
  await seedAdminAndLookups()
  await seedSettingsDefaults()
  await seedContentBlocks()
  await seedAdminRoleCatalog()
  await seedBuiltinShortcodes()

  // Demo/test data — never on production.
  if (!isProduction) {
    await seedCatalog()
    await seedReviewsAndArticles()
    await seedOperationalData()
    await seedExtraAdmins()
  }
}

/**
 * Set BASTUR_SKIP_RUNTIME_MIGRATIONS=1 when the schema is managed
 * externally (e.g. `npm run db:migrate:prod` during deploy) so the
 * web process does not attempt DDL at startup.
 */
function shouldRunRuntimeMigrations(): boolean {
  const raw = (process.env.BASTUR_SKIP_RUNTIME_MIGRATIONS || "").trim().toLowerCase()
  return !(raw === "1" || raw === "true" || raw === "yes")
}

export function ensureDb() {
  const g = globalThis as typeof globalThis & { __bustourEnsureDb?: Promise<void> }
  if (!g.__bustourEnsureDb) {
    g.__bustourEnsureDb = (async () => {
      await readyClient()
      if (shouldRunRuntimeMigrations()) {
        await applyMigrations()
      }
      await seed()
    })().catch((error) => {
      g.__bustourEnsureDb = undefined
      throw error
    })
  }
  return g.__bustourEnsureDb
}

export async function pingDb() {
  await client.execute("SELECT 1")
}
