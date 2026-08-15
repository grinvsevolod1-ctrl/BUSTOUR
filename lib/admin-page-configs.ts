/**
 * Фабрики полных конфигов страниц админки (динамические страны/города/автобусы/
 * трансферы и посадочные авиа/горящих/автобусных туров).
 *
 * Выделено из lib/admin-config.ts: там остаются типы полей, статические группы
 * настроек и реестр pageSettingsGroups; здесь — только функции-фабрики.
 * lib/admin-config.ts реэкспортирует всё отсюда, импорты менять не нужно.
 */
import {
  type SettingsGroup,
  type PageSection,
  pageAlertFields,
  seoPreviewDescriptionFields,
  pageHeaderGroup,
  searchSectionGroup,
  citiesCardsFields,
  resortsSectionFields,
} from "@/lib/admin-config"

/**
 * Full page config for the avia home page (/aviatory/).
 * Keys: `aviatory.*`.
 */
export function aviaHomePageConfig(): {
  heading: string
  url: string
  groups: SettingsGroup[]
  sections: PageSection[]
} {
  const p = "aviatory"
  return {
    heading: "Авиатуры > Главная",
    url: "/aviatury/",
    sections: [
      { key: `${p}.section.search`, label: "Фильтр и результаты поиска" },
      { key: `${p}.section.cities`, label: "Карточки курортов" },
      { key: `${p}.section.resorts`, label: "Таблица" },
      { key: `${p}.section.seo`, label: "SEO-текст (расширенный)" },
      { key: `${p}.section.faq`, label: "Частые вопросы" },
      { key: `${p}.section.callus`, label: "«Есть вопросы?»" },
    ],
    groups: [
      {
        heading: "SEO и мета",
        fields: [
          { key: `${p}.metaTitle`, label: "Title (SEO)", type: "shortcode-input", placeholder: "Авиатуры из Минска 2025–2026 — БасТур" },
          ...seoPreviewDescriptionFields(p),
          { key: `${p}.metaImage`, label: "Превью изображение", type: "media" },
          ...pageAlertFields(p),
        ],
      },
      pageHeaderGroup(p),
      searchSectionGroup(p, {
        category: "avia",
        titlePlaceholder: "Авиатуры — поиск и стоимость",
        titleHint: "Над каталогом с фильтрами. Пусто — покажем «Фильтр и результаты поиска».",
      }),
      {
        heading: "Секция «Карточки курортов»",
        fields: citiesCardsFields(p, {
          titlePlaceholder: "Популярные направления",
          titleHint: "Оставьте пустым — будет «Популярные направления»",
        }),
      },
      {
        heading: "Секция «Таблица авиатуров»",
        fields: resortsSectionFields(p),
      },
    ],
  }
}

/**
 * Returns SettingsGroup[] for an avia country page.
 * Keys follow the pattern `country:{category}:{slug}.*`.
 * @deprecated — use aviaCountryPageConfig() instead
 */
export function aviaCountryPageGroups(slug: string, category: "bus" | "avia" | "hot" = "avia"): SettingsGroup[] {
  return aviaCountryPageConfig(slug, undefined, category).groups
}

/**
 * Full page config for a dynamic avia/bus city page. Keys: `city:{category}:{slug}.*`.
 */
export function aviaCityPageConfig(
  slug: string,
  cityName?: string,
  category: "avia" | "bus" = "avia",
): {
  heading: string
  url: string
  groups: SettingsGroup[]
  sections: PageSection[]
} {
  const p = `city:${category}:${slug}`
  const name = cityName ?? slug
  const isBus = category === "bus"
  return {
    heading: isBus ? `Автобусные туры > Город: ${name}` : `Авиатуры > Город: ${name}`,
    url: isBus ? `/avtobusnye-tury/_/${slug}/` : `/aviatury/_/${slug}/`,
    sections: [
      { key: `${p}.section.search`, label: "Фильтр и резул��таты поиска" },
      { key: `${p}.section.cities`, label: "Карточки курортов" },
      { key: `${p}.section.resorts`, label: "Таблица" },
      { key: `${p}.section.seo`, label: "SEO-��екст (расширенный)" },
      { key: `${p}.section.faq`, label: "Частые вопросы" },
      { key: `${p}.section.callus`, label: "«Есть вопросы?»" },
    ],
    groups: [
      {
        heading: "SEO и мета",
        fields: [
          { key: `${p}.metaTitle`, label: "Title (SEO)", type: "shortcode-input", placeholder: `Туры в ${name} из Минска 2025–2026 — БасТур` },
          ...seoPreviewDescriptionFields(p),
          { key: `${p}.metaImage`, label: "Превью изображение", type: "media" },
          ...pageAlertFields(p),
        ],
      },
      pageHeaderGroup(p),
      searchSectionGroup(p, {
        category,
        titlePlaceholder: isBus ? `Автобусные туры в ${name}` : `Авиатуры в ${name}`,
        titleHint: `Над фильтрами на странице города ${name}. Пусто — стандартный заголовок.`,
      }),
      {
        heading: "Секция «Карточки курортов»",
        fields: citiesCardsFields(p, {
          titlePlaceholder: `Популярные курорты в ${name}`,
          titleHint: "Оставьте пустым — будет «Популярные курорты в [Страна]»",
        }),
      },
      {
        heading: isBus
          ? `Секция «Таблица автобусных туров в ${name}»`
          : `Секция «Таблица авиатуров в ${name}»`,
        fields: resortsSectionFields(p),
      },
    ],
  }
}

/**
 * Full page config for a bus detail page. Keys follow `bus:{slug}.*`.
 */
export function busPageConfig(slug: string, busTitle?: string): {
  heading: string
  url: string
  groups: SettingsGroup[]
  sections: PageSection[]
} {
  const p = `bus:${slug}`
  const title = busTitle ?? slug
  return {
    heading: `Аренда автобусов > ${title}`,
    url: `/bus-rental/${slug}`,
    sections: [
      { key: `${p}.section.specs`, label: "Характеристики" },
      { key: `${p}.section.documents`, label: "Документы" },
      { key: `${p}.section.seating`, label: "Рассадка" },
      { key: `${p}.section.seo`, label: "Расширенный текст" },
      { key: `${p}.section.resorts`, label: "Таблица" },
      { key: `${p}.section.faq`, label: "Частые вопросы" },
      { key: `${p}.section.callus`, label: "«Есть вопросы?»" },
    ],
    groups: [
      {
        heading: "SEO и мета",
        fields: [
          { key: `${p}.metaTitle`, label: "Title (SEO)", type: "shortcode-input", placeholder: `${title} — аренда автобуса` },
          ...seoPreviewDescriptionFields(p),
          { key: `${p}.metaImage`, label: "Превью изображение", type: "media" },
        ],
      },
    ],
  }
}

export function transferPageConfig(slug: string, transferTitle?: string): {
  heading: string
  url: string
  groups: SettingsGroup[]
  sections: PageSection[]
} {
  const p = `transfer:${slug}`
  const title = transferTitle ?? slug
  return {
    heading: `Трансферы в аэропорт > ${title}`,
    url: `/info/transfers/${slug}`,
    sections: [
      { key: `${p}.section.seo`, label: "Расширенный текст" },
      { key: `${p}.section.schedules`, label: "Расписания" },
      { key: `${p}.section.faq`, label: "Частые вопросы" },
      { key: `${p}.section.callus`, label: "«Есть вопросы?»" },
    ],
    groups: [
      {
        heading: "SEO и мета",
        fields: [
          { key: `${p}.metaTitle`, label: "Title (SEO)", type: "shortcode-input", placeholder: `${title} — БасТур` },
          ...seoPreviewDescriptionFields(p),
          { key: `${p}.metaImage`, label: "Превью изображение", type: "media" },
        ],
      },
    ],
  }
}

/**
 * Full page config (identical shape to pageSettingsGroups entries) for a
 * dynamic avia country page. Keys: `country:{category}:{slug}.*`.
 */
export function aviaCountryPageConfig(slug: string, countryName?: string, category: "bus" | "avia" | "hot" = "avia"): {
  heading: string
  url: string
  groups: SettingsGroup[]
  sections: PageSection[]
} {
  const p = `country:${category}:${slug}`
  const name = countryName ?? slug
  const isBus = category === "bus"
  return {
    heading: isBus ? `Автобусные туры > ${name}` : `Авиатуры > ${name}`,
    url: isBus ? `/avtobusnye-tury/${slug}/` : `/aviatury/${slug}/`,
    sections: [
      { key: `${p}.section.search`, label: "Фильтр и результаты поиска" },
      { key: `${p}.section.cities`, label: "Карточки курортов" },
      { key: `${p}.section.resorts`, label: "Таблица" },
      { key: `${p}.section.seo`, label: "SEO-текст (расширенный)" },
      { key: `${p}.section.faq`, label: "Частые вопросы" },
      { key: `${p}.section.callus`, label: "«Есть вопросы?»" },
    ],
    groups: [
      {
        heading: "SEO и мета",
        fields: [
          { key: `${p}.metaTitle`, label: "Title (SEO)", type: "shortcode-input", placeholder: `Авиатуры в ${name} из Минска 2025–2026 — БасТур`, required: true },
          ...seoPreviewDescriptionFields(p, { required: true }),
          { key: `${p}.metaImage`, label: "Превью изображение", type: "media", required: true },
          ...pageAlertFields(p),
        ],
      },
      pageHeaderGroup(p),
      searchSectionGroup(p, {
        category,
        titlePlaceholder: isBus ? `Автобусные туры в ${name}` : `Авиатуры в ${name}`,
        titleHint: `Над фильтрами на странице страны ${name}. Пусто — стандартный заголовок.`,
      }),
      {
        heading: "Секция «Карточки курортов»",
        fields: citiesCardsFields(p, {
          titlePlaceholder: `Популярные курорты в ${name}`,
          titleHint: `Оставьте пустым — будет «Популярные курорты в ${name}»`,
        }),
      },
      {
        heading: isBus
          ? `Секция «Таблица автобусных туров в ${name}»`
          : `Секция «Таблица авиатуров в ${name}»`,
        fields: resortsSectionFields(p),
      },
    ],
  }
}

/**
 * Full page config for the hot (горящие туры) home page (/hot/).
 * Keys: `hot.*`.
 */
export function hotHomePageConfig(): {
  heading: string
  url: string
  groups: SettingsGroup[]
  sections: PageSection[]
} {
  const p = "hot"
  return {
    heading: "Горящие туры > Главная",
    url: "/hot/",
    sections: [
      { key: `${p}.section.search`, label: "Фильтр и результаты поиска" },
      { key: `${p}.section.cities`, label: "Карточки курортов" },
      { key: `${p}.section.resorts`, label: "Таблица" },
      { key: `${p}.section.seo`, label: "SEO-текст" },
      { key: `${p}.section.faq`, label: "Частые вопросы" },
      { key: `${p}.section.callus`, label: "«Есть вопросы?»" },
    ],
    groups: [
      {
        heading: "SEO и мета",
        fields: [
          { key: `${p}.metaTitle`, label: "Title (SEO)", type: "shortcode-input", placeholder: "Горящие туры из Минска 2025–2026 — БасТур" },
          ...seoPreviewDescriptionFields(p),
          { key: `${p}.metaImage`, label: "Превью изображение", type: "media" },
          ...pageAlertFields(p),
        ],
      },
      pageHeaderGroup(p, { introRows: 4 }),
      searchSectionGroup(p, {
        category: "hot",
        titlePlaceholder: "Горящие туры — подбор по цене",
        titleHint: "Над каталогом с фильтрами. Пусто — «Фильтр и результаты поиска».",
      }),
      {
        heading: "Секция «Карточки курортов»",
        fields: citiesCardsFields(p, {
          titlePlaceholder: "Популярные направления",
          titleHint: "Оставьте пустым — будет «Популярные направления»",
        }),
      },
      {
        heading: "Секция «Таблица горящих туров»",
        fields: resortsSectionFields(p),
      },
    ],
  }
}

/**
 * Full page config for bus tours home (/avtobusnye-tury/).
 * Keys: `bustours.*` — not `bus:*` (that prefix is bus rental detail pages).
 */
export function busHomePageConfig(): {
  heading: string
  url: string
  groups: SettingsGroup[]
  sections: PageSection[]
} {
  const p = "bustours"
  return {
    heading: "Автобусные туры > Главная",
    url: "/avtobusnye-tury/",
    sections: [
      { key: `${p}.section.search`, label: "Поиск и список туров" },
      { key: `${p}.section.cities`, label: "Карточки направлений" },
      { key: `${p}.section.resorts`, label: "Таблица" },
      { key: `${p}.section.seo`, label: "SEO-текст" },
      { key: `${p}.section.faq`, label: "Частые вопросы" },
      { key: `${p}.section.callus`, label: "«Есть вопросы?»" },
    ],
    groups: [
      {
        heading: "SEO и мета",
        fields: [
          {
            key: `${p}.metaTitle`,
            label: "Title (SEO)",
            type: "shortcode-input",
            placeholder: "Автобусные туры из Минска 2025–2026 — БасТур",
          },
          ...seoPreviewDescriptionFields(p),
          { key: `${p}.metaImage`, label: "Превью изображение", type: "media" },
          ...pageAlertFields(p),
        ],
      },
      pageHeaderGroup(p, { introRows: 4 }),
      searchSectionGroup(p, {
        category: "bus",
        heading: "Секция «Поиск и список туров»",
        titlePlaceholder: "Автобусные туры — каталог и фильтры",
        titleHint: "Над фильтрами и списком туров. Пусто — стандартный заголовок.",
      }),
      {
        heading: "Секция «Карточки направлений»",
        fields: citiesCardsFields(p, {
          titlePlaceholder: "Популярные направления",
          titleHint: "Оставьте пустым — будет «Популярные направления»",
        }),
      },
      {
        heading: "Секция «Таблица автобусных туров»",
        fields: resortsSectionFields(p),
      },
    ],
  }
}

/**
 * Full page config for a hot country page.
 * Uses the same keys as avia country: `country:{category}:{slug}.*` — shared with public pages.
 */
export function hotCountryPageConfig(slug: string, countryName?: string, category: "bus" | "avia" | "hot" = "hot"): {
  heading: string
  url: string
  groups: SettingsGroup[]
  sections: PageSection[]
} {
  const p = `country:${category}:${slug}`
  const name = countryName ?? slug
  return {
    heading: `Горящие туры > ${name}`,
    url: `/hot/${slug}/`,
    sections: [
      { key: `${p}.section.search`, label: "Фильтр и результаты поиска" },
      { key: `${p}.section.cities`, label: "Карточки курортов" },
      { key: `${p}.section.resorts`, label: "Таблица" },
      { key: `${p}.section.seo`, label: "SEO-текст" },
      { key: `${p}.section.faq`, label: "Частые вопросы" },
      { key: `${p}.section.callus`, label: "«Есть вопросы?»" },
    ],
    groups: [
      {
        heading: "SEO и мета",
        fields: [
          { key: `${p}.metaTitle`, label: "Title (SEO)", type: "shortcode-input", placeholder: `Горящие туры в ${name} — БасТур` },
          ...seoPreviewDescriptionFields(p),
          { key: `${p}.metaImage`, label: "Превью изображение", type: "media" },
          ...pageAlertFields(p),
        ],
      },
      pageHeaderGroup(p),
      searchSectionGroup(p, {
        category: "hot",
        titlePlaceholder: `Горящие туры в ${name}`,
        titleHint: `Над фильтрами на странице страны ${name}. Пусто — стандартный заголовок.`,
      }),
      {
        heading: "Секция «Карточки курортов»",
        fields: citiesCardsFields(p, {
          titlePlaceholder: `Популярные курорты в ${name}`,
          titleHint: `Оставьте пустым — будет «Популярные курорты в ${name}»`,
        }),
      },
      {
        heading: `Секция «Таблица горящих туров в ${name}»`,
        fields: resortsSectionFields(p),
      },
    ],
  }
}

/**
 * Full page config for a hot city page.
 * Uses the same key scheme as avia city: `city:hot:{slug}.*` — shared with public pages.
 */
export function hotCityPageConfig(slug: string, cityName?: string): {
  heading: string
  url: string
  groups: SettingsGroup[]
  sections: PageSection[]
} {
  const p = `city:hot:${slug}`
  const name = cityName ?? slug
  return {
    heading: `Горящие туры > Город: ${name}`,
    url: `/hot/_/${slug}/`,
    sections: [
      { key: `${p}.section.search`, label: "Фильтр и результаты поиска" },
      { key: `${p}.section.cities`, label: "Карточки курортов" },
      { key: `${p}.section.resorts`, label: "Таблица" },
      { key: `${p}.section.seo`, label: "SEO-текст" },
      { key: `${p}.section.faq`, label: "Частые вопросы" },
      { key: `${p}.section.callus`, label: "«Есть вопросы?»" },
    ],
    groups: [
      {
        heading: "SEO и мета",
        fields: [
          { key: `${p}.metaTitle`, label: "Title (SEO)", type: "shortcode-input", placeholder: `Горящие туры — ${name} — БасТур` },
          ...seoPreviewDescriptionFields(p),
          { key: `${p}.metaImage`, label: "Превью изображение", type: "media" },
          ...pageAlertFields(p),
        ],
      },
      pageHeaderGroup(p),
      searchSectionGroup(p, {
        category: "hot",
        titlePlaceholder: `Горящие туры — ${name}`,
        titleHint: `Над фильтрами на странице города ${name}. Пусто — стандартный заголовок.`,
      }),
      {
        heading: "Секция «Карточки курортов»",
        fields: citiesCardsFields(p, {
          titlePlaceholder: `Популярные курорты в ${name}`,
          titleHint: `Оставьте пустым — будет «Популярные курорты в ${name}»`,
        }),
      },
      {
        heading: `Секция «Таблица горящих туров — ${name}»`,
        fields: resortsSectionFields(p),
      },
    ],
  }
}
