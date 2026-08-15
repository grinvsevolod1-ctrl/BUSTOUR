import type { ConsentConfig } from "consentium"

/** Consent categories + storage. Essential is implicit (always on). */
export const CONSENT_TTL_MS = 365 * 24 * 60 * 60 * 1000

export const consentConfig: ConsentConfig = {
  storageKey: "bastur.cookieConsent.v2",
  policyVersion: 1,
  productName: "БасТур",
  routes: {
    cookies: "/legal/cookies",
    privacy: "/legal/privacy",
  },
  retention: [{ dataType: "Выбор категорий cookie", period: "12 месяцев" }],
  categories: [
    {
      id: "functional",
      label: "Функциональные",
      description:
        "Эти cookie повышают безопасность и запоминают ваши настройки на сайте. Они не хранятся на наших серверах и не передаются третьим лицам. Если откажетесь, сайт может забыть настройки и стать менее удобным.",
    },
    {
      id: "analytics",
      label: "Аналитические",
      description:
        "Эти cookie собирают статистику, чтобы мы понимали, какие разделы вам нравятся. Отказ может усложнить адаптацию сайта под ваши предпочтения.",
      respectDoNotTrack: true,
    },
    {
      id: "marketing",
      label: "Рекламные",
      description:
        "Эти cookie делают рекламу более релевантной вашим интересам. Если отключите — реклама станет менее персональной.",
      respectDoNotTrack: true,
    },
  ],
  cookies: [
    {
      name: "bastur.cookieConsent.v2",
      type: "localStorage",
      provider: "БасТур",
      purpose: "Хранение выбора категорий cookie",
      duration: "12 месяцев",
      category: "essential",
    },
  ],
}
