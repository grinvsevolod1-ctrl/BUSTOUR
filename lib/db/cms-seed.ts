// Default CMS content — used to seed settings + content_blocks on first run.

import {
  cookiesBodyHtml,
  offerBodyHtml,
  privacyBodyHtml,
  videoBodyHtml,
} from "@/lib/db/legal-seed"
import { defaultSocialLinks } from "@/lib/social-links"
import { memosDefaultSettings } from "@/lib/memos-page-cms"
import { dictionaryDefaultSettings } from "@/lib/dictionary-page-cms"

export const defaultSettings: Record<string, string> = {
  ...memosDefaultSettings(),
  ...dictionaryDefaultSettings(),
  // Contacts
  "site.brand": "БасТур",
  "site.phone": "+375 29 621-44-77",
  // Footer phones — one per line, shown as-is; tel: link derived automatically.
  "site.phones": "+375 (29) 621-44-77\n+375 (33) 621-44-77\n+375 (25) 621-44-77",
  "site.email": "info@bastur.by",
  "site.address": "г. Минск, пр-т Независимости, 45, оф. 12",
  "site.hours": "10:00–18:00",
  "site.hoursNote": "сб. и вс. — выходной",
  "site.copyright": "© БасТур, 2013–2025. Путешествия, которые хочется повторить.",
  // Web analytics and conversion goals (loaded only after analytics consent)
  "analytics.ymCounterId": "",
  "analytics.gtmId": "",
  "analytics.gaMeasurementId": "",
  "analytics.enableWebvisor": "true",
  "analytics.goalLeadSuccess": "lead_success",
  "analytics.goalCallbackSuccess": "callback_request",
  "analytics.goalReviewSuccess": "review_success",
  "analytics.successRedirectUrl": "",
  // Admin audit retention (days); purge older rows automatically
  "admin.auditRetentionDays": "60",
  // Site-wide announcement popup (важное сообщение при заходе на сайт)
  "announcement.enabled": "0",
  "announcement.title": "",
  "announcement.text": "",
  "announcement.type": "info",
  "announcement.startDate": "",
  "announcement.endDate": "",
  // Socials — unified list; legacy keys kept for migration on read
  "social.links": JSON.stringify(defaultSocialLinks()),
  "social.viber": "viber://chat",
  "social.telegram": "https://t.me/",
  "social.instagram": "https://instagram.com/",
  "social.youtube": "https://youtube.com/",
  // Section visibility (1 = shown, 0 = hidden)
  "section.search": "1",
  "section.featured": "1",
  "section.advantages": "1",
  "section.faq": "1",
  "section.testimonials": "1",
  "section.placement": "1",
  "section.callus": "1",
  // Call us block + tours filter
  "callus.title": "Есть вопросы?",
  "callus.subtitle": "Мы на связи и поможем с выбором тура",
  "callus.button": "Заказать звонок",
  "tours.currencies": "BYN",
  "currency.markupPercent": "2",
  // Section titles
  "title.search": "Подберите путешествие под свой ритм",
  "title.featured": "Путешествия, которые выбирают наши клиенты",
  "title.advantages": "Почему путешествуют с БасТур",
  "title.faq": "Всё о бронировании и поездке",
  "title.testimonials": "Тёплые слова наших туристов",
  "title.placement": "Наше расположение",
  // Yandex org map-widget (Bastur). Adblock may hide iframe — CMS can override.
  "site.mapEmbedUrl":
    "https://yandex.by/map-widget/v1/?ll=27.701630%2C53.949784&mode=search&oid=156910472868&ol=biz&tab=related&z=14.89",
  // Public forms: show «Капча: пройдена / не пройдена» (1 = on)
  "site.captchaStatusVisible": "0",
  "testimonials.infoTitle": "Более 12 лет собираем маршруты, к которым хочется возвращаться",
  "testimonials.infoBody": "Подбираем путешествия под состав группы, бюджет и настроение — от уикенда в Петербурге до отдыха у моря.",
  "testimonials.homeCta": "Все отзывы",
  // Company page (company.body — paragraphs separated by newlines)
  "company.title": "О компании БасТур",
  "company.body":
    "Туристическая компания «БасТур» работает с 2013 года и специализируется на автобусных и авиатурах по России, Литве и другим странам. За это время мы организовали тысячи путешествий и заслужили доверие наших клиентов.\nМы предлагаем туры с авторским подходом: тщательно продуманные маршруты, комфортный транспорт, проверенные отели и опытных гидов. Наша цель — сделать ваш отдых незабываемым.",
  "company.principlesTitle": "Наши принципы",
  "company.image": "/images/bus.png",
  // Staff page (/company/staff)
  "staff.title": "Наша команда",
  "staff.intro": "Профессиональная команда БасТур всегда готова помочь вам выбрать и организовать незабываемое путешествие.",
  // Licenses page (/company)
  "licenses.title": "Лицензии и сертификаты",
  "licenses.intro": "Все разрешительные документы, подтверждающие право компании на осуществление туристической деятельности.",
  // Testimonials page (/testimonials) — SEO keys use admin prefix `reviews.*`
  "testimonials.pageTitle": "Отзывы",
  "testimonials.pageIntro":
    "Дорогие друзья, на этой странице мы публикуем реальные отзывы наших туристов о поездках. Если вы хотите поделиться своим впечатлением от тура, воспользуйтесь, пожалуйста, формой отправки отзыва. После проверки менеджером ваш отзыв будет размещен на сайте.",
  "testimonials.pageButton": "Оставить отзыв",
  "reviews.formUrl": "#",
  "reviews.metaTitle": "Отзывы — БасТур",
  "reviews.metaShortDesc": "Реальные отзывы туристов БасТур о турах и поездках.",
  "reviews.metaDescription":
    "Реальные отзывы наших туристов о турах и поездках. Поделитесь своим впечатлением.",
  // Contacts page (/contacts)
  "contacts.metaTitle": "Контакты — БасТур",
  "contacts.metaShortDesc": "Адрес, телефоны и режим работы офиса БасТур.",
  "contacts.metaDescription":
    "Контакты туристической компании БасТур: адрес, телефон, e-mail и режим работы.",
  // Dictionary page (/info/dictionary) — via dictionaryDefaultSettings() merge above
  // Memos page (/info/memos) — via memosDefaultSettings() merge above
  // Transfers page (/info/transfers)
  "transfers.title": "Трансферы в аэропорт",
  "transfers.intro":
    "Если вы хотя бы раз в жизни летали на самолете из другого города, а то и страны, то вы, наверняка, столкнулись с проблемой трансфера в аэропорт и обратно.\nДаже при наличии собственного транспорта, это большая проблема. Задумайтесь: что такое поездка в аэропорт на собственном автомобиле? В первую очередь, это лишние затраты на бензин. А если речь идет о трансфере в Домодедово, Шереметьево и другие аэропорты Москвы? Выброшенные деньги на топливо, повышенный риск, дополнительное стояние в пробках, невозможность выспаться в дороге — в этом случае обеспечены.\nКроме того, в аэропортах, как правило, нет бесплатных парковок, а стоимость пребывания авто на платной стоянке нередко сравнима с ценой самого авиаперелета.\nПриходится или просить знакомых, или платить за переезд обычным таксистам, которые в силу того, что для них это редкий маршрут, могут банально не рассчитать время в пути и опоздать на самолет, а также завысить стоимость поездки в разы.",
  "transfers.airportsTitle": "Трансфер в аэропорты Москвы из Минска",
  "transfers.individualTitle": "Индивидуальный трансфер в аэропорты Беларуси, России, Украины",
  "transfers.outro":
    "Мы предлагаем удобный и надежный трансфер в аэропорт.\nОт назначенного места вас забирает комфортабельный автобус. Вам нужно только погрузить свои вещи в багажное отделение, сесть в удобное кресло, откинуть спинку, включить любимый фильм и наслаждаться поездкой, изредка любуясь пейзажами за окном.\nМы предлагаем вашему вниманию только выгодные трансферы в аэропорт Минск 2, Домодедово, Шереметьево, Внуково и обратно. Наша компания гарантирует вам своевременное прибытие в аэропорт без опозданий на регистрацию, и подстроится под время вашего вылета.\nЗаказывайте у нас трансфер в аэропорт и обратно, и ваш отдых пройдет безукоризненно!",
  // Hot tours page
  "hot.h1": "Горящие туры",
  "hot.metaTitle": "Горящие туры — БасТур",
  "hot.metaDescription": "Успейте забронировать горящие туры по специальным ценам с ближайшим вылетом.",
  "hot.intro":
    "Успейте забронировать горящие туры по специальным ценам с ближайшим вылетом. Распродажи и акции от всех туроператоров.",
  "hot.seoHtml": "",
  // Catalog homes (SEO + H1) — repair path in ensureDb clears junk like `aviatory-home#s-seo-meta`
  "aviatory.h1": "Авиатуры",
  "aviatory.metaTitle": "Авиатуры — БасТур",
  "aviatory.metaDescription":
    "Пляжный отдых и экскурсионные авиатуры от всех туроператоров. Бронирование из Минска.",
  "aviatory.intro":
    "Пляжный отдых и экскурсионные авиатуры от всех туроператоров. Бронирование из Минска.",
  "bustours.h1": "Автобусные туры",
  "bustours.metaTitle": "Автобусные туры — БасТур",
  "bustours.metaDescription":
    "Комфортные автобусные путешествия из Минска по России, Беларуси и другим направлениям.",
  "bustours.intro":
    "Комфортные автобусные путешествия из Минска по России, Беларуси и другим направлениям.",
  // Bus rental page
  "rental.title": "Аренда автобусов",
  "rental.body":
    "Компания БасТур предлагает аренду комфортабельных автобусов и микроавтобусов с опытными водителями. Мы организуем трансферы, корпоративные и экскурсионные поездки любой сложности.",
  "rental.image": "/images/bus.png",
  "rental.fleetTitle": "Наш автопарк",
  // Legal pages (/legal/*) — bodies from lib/db/legal-seed.ts
  "privacy.title": "Политика конфиденциальности",
  "privacy.metaTitle": "Политика конфиденциальности — БасТур",
  "privacy.metaDescription": "Порядок обработки и защиты персональных данных на сайте bus-tour.by.",
  "privacy.metaShortDesc": "Политика конфиденциальности БасТур.",
  "privacy.body": privacyBodyHtml,
  "offer.title": "Договор публичной оферты ЧТУП «БасТур»",
  "offer.metaTitle": "Договор публичной оферты — БасТур",
  "offer.metaDescription": "Публичная оферта ЧТУП «БасТур» на оказание туристических услуг.",
  "offer.metaShortDesc": "Публичная оферта ЧТУП «БасТур».",
  "offer.body": offerBodyHtml,
  "cookies.title": "Политика в отношении обработки cookie",
  "cookies.metaTitle": "Политика cookie — БасТур",
  "cookies.metaDescription": "Как сайт БасТур использует файлы cookie.",
  "cookies.metaShortDesc": "Политика cookie БасТур.",
  "cookies.body": cookiesBodyHtml,
  "video.title": "Политика видеонаблюдения",
  "video.metaTitle": "Политика видеонаблюдения — БасТур",
  "video.metaDescription": "Порядок видеонаблюдения на объектах ЧТУП «БасТур».",
  "video.metaShortDesc": "Политика видеонаблюдения БасТур.",
  "video.body": videoBodyHtml,
}

type BlockSeed = {
  collection: string
  title?: string
  subtitle?: string
  body?: string
  image?: string
  icon?: string
  href?: string
  extra?: Record<string, unknown>
  visible?: boolean
}

export const defaultBlocks: BlockSeed[] = [
  // ---- Hero slides ----
  {
    collection: "hero",
    title: "Карелия, Петербург и море: выберите своё путешествие",
    subtitle: "Продуманные маршруты, комфортные отели и поддержка менеджера на каждом этапе.",
    image: "/images/karelia-lake.png",
    href: "/avtobusnye-tury/",
    extra: { buttonText: "Смотреть направления" },
  },
  {
    collection: "hero",
    title: "Горящие вылеты в Египет и Турцию",
    subtitle: "Последние места на ближайшие даты — проверим наличие и быстро оформим заявку.",
    image: "/images/spb.png",
    href: "/hot/",
    extra: { buttonText: "К горящим предложениям" },
  },
  {
    collection: "hero",
    title: "Выходные, которые запомнятся",
    subtitle: "Санкт-Петербург, Москва, Карелия и Вильнюс — в удобном формате из Минска.",
    image: "/images/caucasus.png",
    href: "/avtobusnye-tury/",
    extra: { buttonText: "Выбрать маршрут" },
  },
  // ---- Advantages ----
  { collection: "advantage", title: "12 лет в туризме", body: "Знаем, где остановиться, что посмотреть и как сделать дорогу комфортной.", icon: "award" },
  { collection: "advantage", title: "Лучшие цены", body: "Сравниваем даты, отели и программы, чтобы вы получили честную цену.", icon: "wallet" },
  { collection: "advantage", title: "Надёжность", body: "Проверяем партнёров и остаёмся на связи до возвращения домой.", icon: "shield" },
  { collection: "advantage", title: "Поддержка 24/7", body: "Отвечаем на вопросы в мессенджерах и помогаем выбрать подходящий вариант.", icon: "headphones" },
  // ---- FAQ ----
  {
    collection: "faq",
    title: "Как забронировать тур?",
    body: "Выберите тур на сайте и оставьте заявку через форму бронирования либо позвоните нам. Менеджер свяжется с вами, уточнит детали и поможет оформить путёвку.",
    extra: { defaultOpen: true },
  },
  {
    collection: "faq",
    title: "Какие способы оплаты доступны?",
    body: "Мы принимаем оплату наличными в офисе, банковской картой и безналичным переводом для юридических лиц. Возможна оплата в рассрочку по отдельным турам.",
  },
  {
    collection: "faq",
    title: "Можно ли вернуть деньги за тур?",
    body: "Да, возврат возможен согласно условиям договора. Размер удержания зависит от того, за сколько дней до поездки вы отказываетесь от тура.",
  },
  {
    collection: "faq",
    title: "Нужна ли виза для тура?",
    body: "Для туров по России и Беларуси виза не требуется. Для зарубежных направлений мы поможем с оформлением необходимых документов.",
  },
  // ---- Company principles ----
  { collection: "principle", title: "Качество", body: "Мы работаем только с проверенными партнёрами и отвечаем за каждую деталь поездки." },
  { collection: "principle", title: "Забота", body: "Индивидуальный подход к каждому клиенту и поддержка на всех этапах путешествия." },
  { collection: "principle", title: "Честность", body: "Прозрачные цены без скрытых доплат и честная информация о каждом туре." },
  // ---- Fleet (bus rental) ----
  { collection: "fleet", title: "Автобус 49 мест", subtitle: "49 мест", body: "от 120 BYN/час", extra: { features: ["Кондиционер", "Wi-Fi", "Микрофон", "TV"] } },
  { collection: "fleet", title: "Микроавтобус 19 мест", subtitle: "19 мест", body: "от 70 BYN/час", extra: { features: ["Кондиционер", "Аудиосистема", "Мягкие сиденья"] } },
  { collection: "fleet", title: "Минивэн 8 мест", subtitle: "8 мест", body: "от 45 BYN/час", extra: { features: ["Кондиционер", "Комфорт-класс"] } },
  // ---- Footer directions ----
  { collection: "direction", title: "Россия", href: "/avtobusnye-tury/" },
  { collection: "direction", title: "Литва", href: "/avtobusnye-tury/" },
  { collection: "direction", title: "Египет", href: "/aviatory/" },
  { collection: "direction", title: "Карелия", href: "/avtobusnye-tury/" },
  { collection: "direction", title: "Горящие туры", href: "/hot/", image: "/images/egypt-beach.png" },
]
