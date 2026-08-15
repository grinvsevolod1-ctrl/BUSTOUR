import type { DatesTable } from "@/lib/types"

const legacyDates = (value: unknown) => value as DatesTable

const busProgram = (city: string) => [
  { day: "День 1", text: `Выезд из Минска вечером. Комфортный ночной переезд к ${city}.` },
  { day: "День 2", text: `Завтрак и обзорная экскурсия по ${city}. Заселение в отель, свободное время.` },
  { day: "День 3", text: "Экскурсионная программа и прогулка по историческому центру. Вечером — отдых." },
  { day: "День 4", text: "Завтрак, свободное время и выезд в Минск. Прибытие поздним вечером." },
]

const beachProgram = (resort: string) => [
  { day: "День 1", text: `Вылет из Минска, трансфер и заселение в отель ${resort}.` },
  { day: "Дни 2–7", text: "Отдых у моря по системе «всё включено», пляж, бассейн и дополнительные экскурсии." },
  { day: "День 8", text: "Освобождение номера, трансфер в аэропорт и вылет в Минск." },
]

const includedBus = ["Проезд комфортабельным автобусом", "Проживание в отеле выбранной категории", "Завтраки", "Экскурсионная программа", "Сопровождение гида"]
const excludedBus = ["Личные расходы", "Обеды и ужины", "Входные билеты", "Медицинская страховка"]
const includedAvia = ["Авиаперелёт из Минска", "Трансфер аэропорт — отель — аэропорт", "Проживание", "Питание по выбранной концепции", "Медицинская страховка"]
const excludedAvia = ["Экскурсии", "Личные расходы", "Дополнительный багаж", "Виза, если требуется"]

const dates = (note: string, rows: unknown[]) => legacyDates({ note, noteType: "info", currency: "BYN", rows })
const rooms = (base: number, discount = 0) => [
  { name: "Комфорт", price: base, discount },
  { name: "2-местный номер", price: base + 170, discount: Math.max(0, discount - 3) },
  { name: "3-местный номер", price: base + 100, discount: Math.max(0, discount - 5) },
]

const piterDatesTable = dates("Маршрут: Минск — Санкт-Петербург — Петергоф — Пушкин. Цены актуальны до конца сезона.", [
  { dates: "19.06 - 22.06.2025", duration: "4 дня / 3 ночи", description: "Праздничный тур с Эрмитажем, Петергофом и прогулкой по Невскому проспекту.", tags: [{ icon: "flag", label: "Хит сезона" }], rooms: rooms(990, 12) },
  { dates: "17.07 - 20.07.2025", duration: "4 дня / 3 ночи", description: "Белые ночи, разводные мосты и вечерняя прогулка по рекам и каналам.", tags: [{ icon: "star", label: "Хит продаж" }], rooms: rooms(1090, 8) },
  { dates: "21.08 - 24.08.2025", duration: "4 дня / 3 ночи", description: "Петергоф, Царское Село и свободный день для музеев и прогулок.", tags: [{ icon: "gift", label: "Спецпредложение" }], rooms: rooms(1040, 10) },
])

const moscowDates = dates("Три дня в столице: программа рассчитана на первый и повторный визит.", [
  { dates: "12.06 - 14.06.2025", duration: "3 дня / 2 ночи", description: "Красная площадь, Кремль, парк Зарядье и вечерняя Москва-Сити.", tags: [{ icon: "flag", label: "Праздничная дата" }], rooms: rooms(890, 10) },
  { dates: "10.07 - 12.07.2025", duration: "3 дня / 2 ночи", description: "Обзорная экскурсия, ВДНХ и прогулка по старым московским переулкам.", tags: [{ icon: "star", label: "Популярный тур" }], rooms: rooms(920, 5) },
  { dates: "21.08 - 23.08.2025", duration: "3 дня / 2 ночи", description: "Третьяковская галерея, смотровая площадка и свободный вечер в центре.", tags: [{ icon: "sparkles", label: "Раннее бронирование" }], rooms: rooms(950, 8) },
])

const kareliaDates = dates("Путешествие по северной природе с посещением Рускеалы и водопадов Ахвенкоски.", [
  { dates: "03.07 - 08.07.2025", duration: "6 дней / 5 ночей", description: "Рускеала, водопады, Ладожские шхеры и уютные карельские деревни.", tags: [{ icon: "sun", label: "Летняя Карелия" }], rooms: rooms(1390, 10) },
  { dates: "07.08 - 12.08.2025", duration: "6 дней / 5 ночей", description: "Природные маршруты, северная кухня и свободное время у озера.", tags: [{ icon: "heart", label: "Для всей семьи" }], rooms: rooms(1450, 7) },
  { dates: "02.10 - 07.10.2025", duration: "6 дней / 5 ночей", description: "Золотая осень в Карелии, мраморные каньоны и водопады.", tags: [{ icon: "gift", label: "Осеннее предложение" }], rooms: rooms(1290, 12) },
])

const caucasusDates = dates("Большое путешествие по Кавказу с комфортными переездами и ночёвками в проверенных отелях.", [
  { dates: "15.06 - 21.06.2025", duration: "7 дней / 6 ночей", description: "Минеральные воды, горные ущелья, смотровые площадки и местная кухня.", tags: [{ icon: "sun", label: "Летний маршрут" }], rooms: rooms(1690, 8) },
  { dates: "13.07 - 19.07.2025", duration: "7 дней / 6 ночей", description: "Пятигорск, Домбай и живописные дороги Большого Кавказа.", tags: [{ icon: "star", label: "Авторская программа" }], rooms: rooms(1790, 5) },
  { dates: "14.09 - 20.09.2025", duration: "7 дней / 6 ночей", description: "Мягкий бархатный сезон и неспешные прогулки по горным курортам.", tags: [{ icon: "gift", label: "Бархатный сезон" }], rooms: rooms(1650, 10) },
])

const vilniusDates = dates("Однодневная поездка из Минска в Старый город и торговые центры Вильнюса.", [
  { dates: "28.06 - 28.06.2025", duration: "1 день / 0 ночей", description: "Старый город, Ужупис, свободное время в Akropolis и вечерний выезд домой.", tags: [{ icon: "shopping-bag", label: "Шоп-тур" }], rooms: rooms(390, 5) },
  { dates: "26.07 - 26.07.2025", duration: "1 день / 0 ночей", description: "Барочный Вильнюс, уютные кафе и время для покупок.", tags: [{ icon: "star", label: "Выезд выходного дня" }], rooms: rooms(420, 0) },
  { dates: "30.08 - 30.08.2025", duration: "1 день / 0 ночей", description: "Летняя прогулка по столице Литвы с сопровождением гида.", tags: [{ icon: "sparkles", label: "Свободные места" }], rooms: rooms(420, 5) },
])

const hurghadaDates = dates("Отельный отдых на Красном море. В стоимость включены перелёт, трансфер и питание.", [
  { dates: "18.06 - 25.06.2025", duration: "8 дней / 7 ночей", description: "Песчаный пляж, коралловый риф и спокойный отдых всей семьёй.", tags: [{ icon: "sun", label: "Всё включено" }], rooms: rooms(2790, 8) },
  { dates: "09.07 - 16.07.2025", duration: "8 дней / 7 ночей", description: "Хургада с аквапарком, вечерними шоу и экскурсиями по желанию.", tags: [{ icon: "gift", label: "Семейный отдых" }], rooms: rooms(2890, 10) },
  { dates: "20.08 - 27.08.2025", duration: "8 дней / 7 ночей", description: "Летний отдых на первой береговой линии с питанием AI.", tags: [{ icon: "star", label: "Популярный отель" }], rooms: rooms(2990, 6) },
])

const sharmDates = dates("Шарм-эль-Шейх для любителей снорклинга, тёплого моря и яркой вечерней жизни.", [
  { dates: "25.06 - 02.07.2025", duration: "8 дней / 7 ночей", description: "Коралловый риф, бухта Наама-Бей и отдых в отеле 5*.", tags: [{ icon: "sun", label: "Море и риф" }], rooms: rooms(3190, 7) },
  { dates: "16.07 - 23.07.2025", duration: "8 дней / 7 ночей", description: "Пляжный отдых, дайвинг и экскурсия в Рас-Мохаммед.", tags: [{ icon: "star", label: "Премиум отдых" }], rooms: rooms(3290, 5) },
  { dates: "03.09 - 10.09.2025", duration: "8 дней / 7 ночей", description: "Бархатный сезон в Шарм-эль-Шейхе с комфортным размещением.", tags: [{ icon: "gift", label: "Выгодная дата" }], rooms: rooms(3090, 9) },
])

const dubaiDates = dates("Городской отдых в Дубае: пляж, современные достопримечательности и шопинг.", [
  { dates: "22.06 - 29.06.2025", duration: "8 дней / 7 ночей", description: "Бурдж-Халифа, пляж Jumeirah, марина и вечернее сафари в пустыне.", tags: [{ icon: "sparkles", label: "Город и море" }], rooms: rooms(4290, 6) },
  { dates: "13.07 - 20.07.2025", duration: "8 дней / 7 ночей", description: "Комфортный отель, пляжный отдых и свободное время для покупок.", tags: [{ icon: "shopping-bag", label: "Шопинг" }], rooms: rooms(4490, 8) },
  { dates: "14.09 - 21.09.2025", duration: "8 дней / 7 ночей", description: "Путешествие для тех, кто хочет совместить море, архитектуру и гастрономию.", tags: [{ icon: "star", label: "Новинка" }], rooms: rooms(4390, 5) },
])

const antalyaDates = dates("Анталия — мягкий климат, тёплое море и удобные отели для семейного отдыха.", [
  { dates: "11.06 - 18.06.2025", duration: "8 дней / 7 ночей", description: "Отель на побережье, питание AI, бассейны и трансфер из аэропорта.", tags: [{ icon: "sun", label: "Пляжный сезон" }], rooms: rooms(2990, 10) },
  { dates: "02.07 - 09.07.2025", duration: "8 дней / 7 ночей", description: "Семейный курорт с мини-клубом, водными развлечениями и удобным пляжем.", tags: [{ icon: "heart", label: "С детьми" }], rooms: rooms(3190, 7) },
  { dates: "27.08 - 03.09.2025", duration: "8 дней / 7 ночей", description: "Бархатный сезон, экскурсия в старый город и отдых на первой линии.", tags: [{ icon: "gift", label: "Бархатный сезон" }], rooms: rooms(3090, 9) },
])

const tours = [
  { slug: "tur-vyhodnogo-dnya-v-piter", title: "Тур выходного дня в Санкт-Петербург", description: "Насыщенная поездка из Минска к дворцам, музеям и разводным мостам северной столицы.", price: "990 BYN", image: "/images/spb.png", category: "bus" as const, duration: "4 дня / 3 ночи", country: "Россия", nights: 3, featured: true, program: busProgram("Санкт-Петербург"), included: includedBus, excluded: excludedBus, datesTable: piterDatesTable },
  { slug: "vyhodnye-v-moskve", title: "Выходные в Москве", description: "Красная площадь, Кремль и современные панорамы столицы в одном удобном туре.", price: "890 BYN", image: "/images/moscow.png", category: "bus" as const, duration: "3 дня / 2 ночи", country: "Россия", nights: 2, featured: true, program: busProgram("Москву").slice(0, 3), included: includedBus, excluded: excludedBus, datesTable: moscowDates },
  { slug: "novogodniy-tur-v-kareliyu", title: "Карельские озёра и Рускеала", description: "Природное путешествие к мраморным каньонам, водопадам и северным озёрам.", price: "1 290 BYN", image: "/images/karelia-lake.png", category: "bus" as const, duration: "6 дней / 5 ночей", country: "Россия", nights: 5, featured: true, program: busProgram("Карелию"), included: includedBus, excluded: excludedBus, datesTable: kareliaDates },
  { slug: "tur-po-kavkazu", title: "Жемчужины Кавказа", description: "Горные ущелья, курорты Кавказа и гастрономические открытия в большом автобусном маршруте.", price: "1 650 BYN", image: "/images/caucasus.png", category: "bus" as const, duration: "7 дней / 6 ночей", country: "Грузия", nights: 6, featured: true, program: busProgram("Кавказ"), included: includedBus, excluded: excludedBus, datesTable: caucasusDates },
  { slug: "shop-tur-v-vilnyus", title: "Шоп-тур и прогулка по Вильнюсу", description: "Барочный Старый город, уютные улицы и свободное время для покупок.", price: "390 BYN", image: "/images/vilnius.png", category: "bus" as const, duration: "1 день", country: "Литва", nights: 0, featured: false, program: [{ day: "День 1", text: "Ранний выезд из Минска. Экскурсия по Старому городу, свободное время в торговых центрах и возвращение домой." }], included: ["Проезд автобусом", "Сопровождение гида", "Обзорная экскурсия"], excluded: ["Питание", "Личные расходы", "Покупки"], datesTable: vilniusDates },
  { slug: "otdyh-v-egipte", title: "Хургада: море и всё включено", description: "Тёплое Красное море, песчаные пляжи и спокойный отдых в отеле 4–5*.", price: "2 790 BYN", image: "/images/egypt.png", category: "bus" as const, duration: "8 дней / 7 ночей", country: "Египет", nights: 7, featured: true, program: beachProgram("в Хургаде"), included: includedAvia, excluded: excludedAvia, datesTable: hurghadaDates },
  { slug: "otdyh-v-sharme", title: "Шарм-эль-Шейх: коралловый риф", description: "Яркий отдых на Красном море для любителей снорклинга, солнца и красивых бухт.", price: "3 090 BYN", image: "/images/egypt-sharm.png", category: "bus" as const, duration: "8 дней / 7 ночей", country: "Египет", nights: 7, featured: false, program: beachProgram("в Шарм-эль-Шейхе"), included: includedAvia, excluded: excludedAvia, datesTable: sharmDates },
  { slug: "dubai-city-break", title: "Дубай: город будущего и пляж", description: "Современная архитектура, золотые пляжи, сафари и незабываемый шопинг.", price: "4 290 BYN", image: "/images/egypt-hurghada.png", category: "bus" as const, duration: "8 дней / 7 ночей", country: "ОАЭ", nights: 7, featured: true, program: beachProgram("в Дубае"), included: includedAvia, excluded: excludedAvia, datesTable: dubaiDates },
  { slug: "antalya-family-resort", title: "Анталия: семейный отдых AI", description: "Тёплое море, удобный пляж и отели с развлечениями для всей семьи.", price: "2 990 BYN", image: "/images/egypt-beach.png", category: "bus" as const, duration: "8 дней / 7 ночей", country: "Турция", nights: 7, featured: false, program: beachProgram("в Анталии"), included: includedAvia, excluded: excludedAvia, datesTable: antalyaDates },
  { slug: "goryashaya-hurgada", title: "Горящая Хургада — успейте к морю", description: "Последние места на ближайший вылет: солнце, море и отель с питанием всё включено.", price: "2 190 BYN", image: "/images/egypt-hurghada.png", category: "bus" as const, duration: "8 дней / 7 ночей", country: "Египет", nights: 7, featured: true, program: beachProgram("в Хургаде"), included: includedAvia, excluded: excludedAvia, datesTable: dates("Горящее предложение с ближайшим вылетом из Минска.", [{ dates: "18.06 - 25.06.2025", duration: "8 дней / 7 ночей", description: "Последние номера по специальной цене.", tags: [{ icon: "gift", label: "Горящее предложение" }], rooms: rooms(2190, 15) }]) },
  { slug: "goryashaya-antalya", title: "Горящая Анталия — семейная цена", description: "Выгодный отдых на турецком побережье с быстрым вылетом и отелем AI.", price: "2 490 BYN", image: "/images/egypt-beach.png", category: "bus" as const, duration: "8 дней / 7 ночей", country: "Турция", nights: 7, featured: true, program: beachProgram("в Анталии"), included: includedAvia, excluded: excludedAvia, datesTable: dates("Специальная цена действует до закрытия квоты.", [{ dates: "25.06 - 02.07.2025", duration: "8 дней / 7 ночей", description: "Отель у моря с детской инфраструктурой.", tags: [{ icon: "sun", label: "Вылет скоро" }], rooms: rooms(2490, 12) }]) },
  { slug: "goryashiy-dubai", title: "Горящий Дубай — короткая пауза у моря", description: "Стильный городской отель, пляж и экскурсионная программа по специальной цене.", price: "3 590 BYN", image: "/images/egypt.png", category: "bus" as const, duration: "6 дней / 5 ночей", country: "ОАЭ", nights: 5, featured: false, program: beachProgram("в Дубае").slice(0, 2), included: includedAvia, excluded: excludedAvia, datesTable: dates("Ограниченная квота на ближайший вылет.", [{ dates: "02.07 - 07.07.2025", duration: "6 дней / 5 ночей", description: "Дубай-Марина, пляжный день и вечернее сафари.", tags: [{ icon: "sparkles", label: "Последние места" }], rooms: rooms(3590, 10) }]) },
] satisfies { slug: string; title: string; description: string; price: string; image: string; category: "bus"; duration: string; country: string; nights: number; featured: boolean; program: { day: string; text: string }[]; included: string[]; excluded: string[]; datesTable?: DatesTable }[]

export const seedTours = tours.map((tour) => ({ ...tour, departure: "Минск" }))

export const seedReviews = [
  { name: "Анна Ковалёва", tour: "Тур выходного дня в Санкт-Петербург", text: "Петербург получился очень насыщенным: Эрмитаж, Петергоф и вечерняя прогулка по Неве. Гид заботился о группе, автобус удобный.", rating: 5 },
  { name: "Дмитрий Сидоров", tour: "Выходные в Москве", text: "Удобный ночной переезд и отличная программа. За три дня успели увидеть главные места и оставить время для самостоятельной прогулки.", rating: 5 },
  { name: "Елена Морозова", tour: "Шоп-тур и прогулка по Вильнюсу", text: "Успели и погулять по Старому городу, и сделать покупки. Менеджер заранее прислал подробную памятку.", rating: 5 },
  { name: "Ольга Петрова", tour: "Карельские озёра и Рускеала", text: "Карелия превзошла ожидания. Рускеала, водопады и очень красивые дороги — хочется вернуться осенью.", rating: 5 },
  { name: "Максим Орлов", tour: "Жемчужины Кавказа", text: "Большой маршрут, но всё хорошо организовано: понятная программа, хорошие отели и внимательный сопровождающий.", rating: 4 },
  { name: "Мария Волкова", tour: "Хургада: море и всё включено", text: "Отель соответствовал описанию, трансфер прошёл быстро, море тёплое. Отдельное спасибо за подбор семейного номера.", rating: 5 },
  { name: "Ирина Белова", tour: "Шарм-эль-Шейх: коралловый риф", text: "Риф невероятный, отель спокойный, а экскурсию в заповедник организовали на месте. Всё понятно и без лишней суеты.", rating: 5 },
  { name: "Сергей Лебедев", tour: "Дубай: город будущего и пляж", text: "Дубай впечатляет. Благодаря консультации БасТур выбрали удобный отель рядом с пляжем и не переплатили за лишние услуги.", rating: 5 },
  { name: "Наталья Романова", tour: "Анталия: семейный отдых AI", text: "Отдыхали с ребёнком — понравились детский клуб, короткий трансфер и питание. Будем обращаться снова.", rating: 5 },
]

export const seedArticles = [
  { slug: "kak-podgotovitsya-k-avtobusnomu-turu", title: "Как подготовиться к автобусному туру", excerpt: "Практичная памятка о багаже, дороге и документах для комфортного путешествия.", image: "/images/bus.png", date: "14 марта 2025", content: ["Автобусный тур начинается задолго до посадки. Проверьте документы, сохраните программу в телефоне и возьмите небольшую сумку с вещами для дороги.", "В салоне пригодятся подушка для шеи, вода, лёгкий перекус, наушники и зарядное устройство. Для ночного переезда выбирайте удобную многослойную одежду.", "За день до выезда менеджер напомнит место и время посадки. Если планы изменились, сразу свяжитесь с нами — мы подскажем доступные варианты."] },
  { slug: "peterburg-za-chetire-dnya", title: "Санкт-Петербург за четыре дня: маршрут первого знакомства", excerpt: "Собрали главные впечатления северной столицы в логичную программу без спешки.", image: "/images/spb-main.png", date: "2 марта 2025", content: ["Первый день лучше посвятить центру: Невский проспект, Дворцовая площадь и вечерняя прогулка по набережным создают первое впечатление о городе.", "На второй день отправляйтесь в Эрмитаж, а затем оставьте время на каналы и уютные дворы-колодцы. При хорошей погоде прогулка на теплоходе станет главным воспоминанием.", "Петергоф и Царское Село удобно включить в загородную часть маршрута. Мы заранее закладываем время на экскурсии и возвращение в отель."] },
  { slug: "vse-vklyucheno-egipet-ili-turciya", title: "Египет или Турция: какой отдых выбрать", excerpt: "Сравниваем два популярных направления по морю, сезону и формату отдыха.", image: "/images/egypt-beach.png", date: "18 февраля 2025", content: ["Египет выбирают за круглогодичное Красное море, коралловые рифы и стабильный формат отдыха всё включено.", "Анталия подходит тем, кто ценит зелёные территории отелей, семейную инфраструктуру и короткий трансфер до курорта.", "Наш менеджер поможет сравнить отели по пляжу, питанию, расположению и бюджету — расскажите, каким вы видите идеальный отпуск."] },
  { slug: "kareliya-v-lyuboe-vremya-goda", title: "Карелия в любое время года", excerpt: "Летом — озёра и водопады, осенью — золотые леса, зимой — снежные маршруты.", image: "/images/hero-karelia-winter.png", date: "29 января 2025", content: ["Карелия меняется каждый сезон. Летом сюда едут за прогулками по Ладоге, осенью — за тишиной и цветом лесов, зимой — за снежной сказкой.", "В каждом выезде мы оставляем время для фотографий, местной кухни и небольших самостоятельных прогулок."] },
]
