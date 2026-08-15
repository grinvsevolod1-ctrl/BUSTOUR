# Прогресс работ (для продолжения при обрыве чата)

Формат: [x] сделано / [ ] осталось. После каждой задачи — push в main.

## Задачи текущей сессии

- [x] 1. Баги: битые символы (5 файлов), диалог «несохранённые изменения» (токен admin-card + ложный dirty на маунте: shortcode-input dispatch + RTE onCreate + onBlur), Vercel Analytics 404 на self-hosted
- [x] 2. Единая система валют:
  - components/currency/currency-icon.tsx — векторные иконки (BYN=SVG пользователя, USD/EUR/RUB/PLN/GBP/CHF/UAH/KZT/TRY/CNY/JPY=lucide)
  - components/currency/currency-select.tsx — единый дропдаун с иконками (a11y, listbox)
  - Внедрён: tour-additional-block (datesCurrency, extraPriceCurrency), tour-pricing-editor (валюта таблицы + валюта доп. цены строк), currency-manager (иконки в таблице)
  - Автообновление NBRB: lib/currency-auto-refresh.ts + instrumentation.ts (каждые 6ч + при старте, лидер-лок через настройку currencyNbrbLastAutoRefreshAt)
  - Проверено в браузере: дропдаун с иконками работает на форме тура
- [x] 3. Заявки — уведомления и аналитика:
  - Группа настроек «Уведомления о заявках»: notify.emailTo/emailFrom/emailEnabled/telegramEnabled/telegramChatId — настройки из БД перекрывают env (LEAD_EMAIL_TO и т.п.)
  - lib/notify.ts: loadNotifyConfig() читает getSettings() с фолбэком на env, валидация списка e-mail
  - Facebook (Meta) Pixel: поле analytics.fbPixelId, загрузка только при marketing-consent (analytics-when-consented.tsx), trackCustom для целей
  - CSP: + connect.facebook.net, facebook.com, google-analytics.com
  - Проверено в браузере: обе группы настроек рендерятся
- [ ] 4. Reorder-стрелки во всех подходящих разделах админки
- [ ] 5. Умный поиск в шапке админки (синонимы, «человеческие» описания разделов)
- [ ] 6. Сворачиваемые карточки туров в редактировании; удобные уведомления «мы не работаем» (page-alerts)
- [ ] 7. UI-полировка админки

## Заметки

- Ошибка `e.getAll is not a function` уже исправлена в components/admin/page-faq-form.tsx (validate использовал HTMLFormElement.getAll) — проверить другие вхождения.
- CSP для tourvisor/yandex.by уже добавлен в next.config.mjs — на проде старый билд, требуется деплой.
- SVG-символ BYN пользователя: public/icons/currency/byn.svg (после задачи 2).
- Уведомление «не работаем» = раздел page-alerts (скриншот пользователя) — диалог unsaved-changes ломается стилями.
