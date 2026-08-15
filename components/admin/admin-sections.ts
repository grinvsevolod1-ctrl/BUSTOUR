/**
 * Единый реестр разделов админки.
 *
 * Источник правды для:
 * - components/admin/admin-search.tsx — поиск по разделам (Ctrl+K);
 * - components/admin/admin-nav.tsx — тип AdminCapability для скрытия
 *   пунктов меню по ролям (структуру дерева nav держит у себя,
 *   т.к. у него своя иерархия branch/leaf).
 *
 * Новый раздел добавляйте сюда: он сразу появится в поиске,
 * а nav подключит его через свою секцию.
 */

import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  Map,
  MapPin,
  Globe,
  Coins,
  Inbox,
  Star,
  Newspaper,
  Settings,
  Bus,
  Plane,
  Users,
  BadgeCheck,
  CalendarDays,
  Images,
  Archive,
  Braces,
  Flame,
  BookOpen,
  Building2,
  Contact,
  ScrollText,
  UserRound,
} from 'lucide-react';

/** Возможности ролей, ограничивающие доступ к разделам (см. lib/admin-roles). */
export type AdminCapability =
  | 'manage_users'
  | 'manage_roles'
  | 'manage_settings'
  | 'manage_currencies'
  | 'manage_content'
  | 'view_audit';

export type AdminSectionEntry = {
  href: string;
  label: string;
  /** «Человеческое» описание — что можно сделать в разделе */
  description: string;
  /** Синонимы и разговорные формулировки (рус/лат/жаргон) */
  synonyms: string[];
  group: string;
  icon: LucideIcon;
  capability?: AdminCapability;
};

export const ADMIN_SECTIONS: AdminSectionEntry[] = [
  {
    href: '/admin',
    label: 'Дашборд',
    description: 'Сводка: заявки, статистика, быстрые действия',
    synonyms: ['главная админки', 'dashboard', 'обзор', 'статистика', 'сводка', 'панель'],
    group: 'Операции',
    icon: LayoutDashboard,
  },
  {
    href: '/admin/pages/home',
    label: 'Главная сайта',
    description: 'Тексты, блоки и SEO главной страницы сайта',
    synonyms: ['home', 'домашняя', 'главная страница', 'лендинг', 'первый экран', 'баннер'],
    group: 'Операции',
    icon: Settings,
  },
  {
    href: '/admin/leads',
    label: 'Заявки',
    description: 'Обращения клиентов: звонки, брони, вопросы',
    synonyms: ['лиды', 'leads', 'клиенты', 'обращения', 'заказы', 'брони', 'бронирования', 'запросы'],
    group: 'Операции',
    icon: Inbox,
  },
  {
    href: '/admin/pages/bus-home',
    label: 'Автобусные туры — посадочная',
    description: 'Страница раздела автобусных туров: тексты и SEO',
    synonyms: ['автобус', 'bus', 'автобусные туры страница'],
    group: 'Автобусные туры',
    icon: Bus,
  },
  {
    href: '/admin/countries?category=bus',
    label: 'Страны (автобусные)',
    description: 'Список стран для автобусных туров',
    synonyms: ['страны', 'countries', 'направления', 'куда едем'],
    group: 'Автобусные туры',
    icon: Globe,
  },
  {
    href: '/admin/cities?category=bus',
    label: 'Города (автобусные)',
    description: 'Города и курорты автобусных направлений',
    synonyms: ['города', 'cities', 'курорты'],
    group: 'Автобусные туры',
    icon: MapPin,
  },
  {
    href: '/admin/tours',
    label: 'Список туров',
    description: 'Создание и редактирование туров: описание, фото, цены',
    synonyms: ['туры', 'tours', 'путёвки', 'путевки', 'поездки', 'редактировать тур', 'добавить тур'],
    group: 'Автобусные туры',
    icon: Map,
  },
  {
    href: '/admin/tour-pricing',
    label: 'Даты и цены',
    description: 'Календарь заездов и стоимость по датам',
    synonyms: ['цены', 'prices', 'даты', 'календарь', 'заезды', 'стоимость', 'прайс'],
    group: 'Автобусные туры',
    icon: CalendarDays,
  },
  {
    href: '/admin/pages/aviatory-home',
    label: 'Авиатуры — посадочная',
    description: 'Страница раздела авиатуров: тексты и SEO',
    synonyms: ['авиа', 'avia', 'самолёт', 'самолет', 'перелёт', 'перелет', 'авиатуры'],
    group: 'Авиатуры',
    icon: Plane,
  },
  {
    href: '/admin/countries?category=avia',
    label: 'Страны (авиа)',
    description: 'Список стран для авиатуров',
    synonyms: ['страны авиа'],
    group: 'Авиатуры',
    icon: Globe,
  },
  {
    href: '/admin/cities?category=avia',
    label: 'Города (авиа)',
    description: 'Города и курорты авианаправлений',
    synonyms: ['города авиа'],
    group: 'Авиатуры',
    icon: MapPin,
  },
  {
    href: '/admin/pages/hot',
    label: 'Горящие туры',
    description: 'Страница горящих туров: подборки и SEO',
    synonyms: ['горящие', 'hot', 'скидки', 'акции', 'last minute', 'ласт минут'],
    group: 'Горящие туры',
    icon: Flame,
  },
  {
    href: '/admin/countries?category=hot',
    label: 'Страны (горящие)',
    description: 'Список стран для горящих туров',
    synonyms: ['страны горящие'],
    group: 'Горящие туры',
    icon: Globe,
  },
  {
    href: '/admin/cities?category=hot',
    label: 'Города (горящие)',
    description: 'Города и курорты горящих направлений',
    synonyms: ['города горящие'],
    group: 'Горящие туры',
    icon: MapPin,
  },
  {
    href: '/admin/pages/transfers',
    label: 'Трансферы — посадочная',
    description: 'Страница раздела трансферов: тексты и SEO',
    synonyms: ['трансфер страница'],
    group: 'Трансферы',
    icon: Settings,
  },
  {
    href: '/admin/schedules',
    label: 'Рейсы и расписание',
    description: 'Расписание регулярных рейсов и трансферов',
    synonyms: ['расписание', 'schedule', 'рейсы', 'график', 'время отправления'],
    group: 'Трансферы',
    icon: CalendarDays,
  },
  {
    href: '/admin/transfers',
    label: 'Маршруты трансферов',
    description: 'Направления трансферов: аэропорты, цены, порядок',
    synonyms: ['трансферы', 'transfers', 'аэропорт', 'шереметьево', 'внуково', 'домодедово', 'маршрут'],
    group: 'Трансферы',
    icon: Map,
  },
  {
    href: '/admin/pages/rental',
    label: 'Аренда автобусов — посадочная',
    description: 'Страница аренды автобусов: тексты и SEO',
    synonyms: ['аренда', 'rental', 'заказать автобус'],
    group: 'Аренда автобусов',
    icon: Settings,
  },
  {
    href: '/admin/buses',
    label: 'Автобусный парк',
    description: 'Автобусы компании: фото, вместимость, описание',
    synonyms: ['автобусы', 'buses', 'парк', 'транспорт', 'машины'],
    group: 'Аренда автобусов',
    icon: Bus,
  },
  {
    href: '/admin/articles',
    label: 'Статьи и блог',
    description: 'Публикации, новости и полезные материалы',
    synonyms: ['блог', 'blog', 'статьи', 'новости', 'посты', 'публикации'],
    group: 'Контент и SEO',
    icon: Newspaper,
  },
  {
    href: '/admin/reviews',
    label: 'Отзывы',
    description: 'Модерация отзывов клиентов',
    synonyms: ['reviews', 'комментарии', 'оценки', 'рейтинг', 'мнения'],
    group: 'Контент и SEO',
    icon: Star,
  },
  {
    href: '/admin/pages/company',
    label: 'Компания',
    description: 'Страница «О компании»: история, миссия, реквизиты',
    synonyms: ['о нас', 'about', 'о компании', 'история'],
    group: 'Инфо-страницы',
    icon: Building2,
  },
  {
    href: '/admin/pages/contacts',
    label: 'Контакты',
    description: 'Адреса, телефоны, карта и режим работы',
    synonyms: ['contacts', 'телефон', 'адрес', 'почта', 'email', 'режим работы', 'как связаться'],
    group: 'Инфо-страницы',
    icon: Contact,
  },
  {
    href: '/admin/pages/memos',
    label: 'Памятка',
    description: 'Памятка туристу: что взять, правила, советы',
    synonyms: ['памятка туристу', 'советы', 'инструкция', 'faq', 'вопросы'],
    group: 'Инфо-страницы',
    icon: ScrollText,
  },
  {
    href: '/admin/licenses',
    label: 'Документы',
    description: 'Лицензии, сертификаты и свидетельства компании',
    synonyms: ['лицензии', 'сертификаты', 'licenses', 'свидетельства', 'разрешения', 'iso'],
    group: 'Инфо-страницы',
    icon: BadgeCheck,
  },
  {
    href: '/admin/staff',
    label: 'Сотрудники',
    description: 'Команда компании: фото, должности, контакты',
    synonyms: ['staff', 'команда', 'персонал', 'работники', 'менеджеры', 'люди'],
    group: 'Инфо-страницы',
    icon: UserRound,
  },
  {
    href: '/admin/pages/legal',
    label: 'Юридические страницы',
    description: 'Оферта, политика конфиденциальности, cookie',
    synonyms: ['оферта', 'политика', 'privacy', 'куки', 'cookie', 'право', 'договор', 'персональные данные'],
    group: 'Инфо-страницы',
    icon: BadgeCheck,
  },
  {
    href: '/admin/pages/dictionary',
    label: 'Туристический словарь',
    description: 'Термины и определения для туристов',
    synonyms: ['словарь', 'глоссарий', 'термины', 'dictionary'],
    group: 'Инфо-страницы',
    icon: BookOpen,
  },
  {
    href: '/admin/media',
    label: 'Медиагалерея',
    description: 'Все изображения и файлы сайта',
    synonyms: ['медиа', 'галерея', 'картинки', 'фото', 'изображения', 'файлы', 'загрузки', 'media'],
    group: 'Управление',
    icon: Images,
  },
  {
    href: '/admin/currencies',
    label: 'Валюты',
    description: 'Курсы валют, наценка и синхронизация с НБРБ',
    synonyms: ['курс', 'валюта', 'currency', 'доллар', 'евро', 'рубль', 'нбрб', 'обмен', 'usd', 'eur', 'byn'],
    group: 'Управление',
    icon: Coins,
    capability: 'manage_currencies',
  },
  {
    href: '/admin/users',
    label: 'Пользователи',
    description: 'Администраторы панели и их права',
    synonyms: ['админы', 'users', 'аккаунты', 'доступы', 'права', 'логины'],
    group: 'Управление',
    icon: Users,
    capability: 'manage_users',
  },
  {
    href: '/admin/settings',
    label: 'Настройки сайта',
    description: 'Общие настройки: уведомления, аналитика, интеграции',
    synonyms: ['settings', 'конфигурация', 'уведомления', 'telegram', 'аналитика', 'пиксель', 'метрика'],
    group: 'Управление',
    icon: Settings,
    capability: 'manage_settings',
  },
  {
    href: '/admin/shortcodes',
    label: 'Шорткоды',
    description: 'Переиспользуемые вставки для текстов',
    synonyms: ['shortcodes', 'вставки', 'сниппеты', 'переменные'],
    group: 'Управление',
    icon: Braces,
    capability: 'manage_settings',
  },
  {
    href: '/admin/audit',
    label: 'Журнал действий',
    description: 'Кто и что менял в админке',
    synonyms: ['аудит', 'audit', 'лог', 'история изменений', 'журнал'],
    group: 'Управление',
    icon: CalendarDays,
    capability: 'view_audit',
  },
  {
    href: '/admin/archive',
    label: 'Архив',
    description: 'Удалённые записи: восстановление и очистка',
    synonyms: ['archive', 'корзина', 'удалённые', 'удаленные', 'восстановить'],
    group: 'Управление',
    icon: Archive,
  },
  {
    href: '/admin/roles',
    label: 'Роли',
    description: 'Роли администраторов и их возможности',
    synonyms: ['roles', 'права доступа', 'permissions'],
    group: 'Управление',
    icon: BadgeCheck,
    capability: 'manage_roles',
  },
  {
    href: '/admin/content',
    label: 'Блоки контента',
    description: 'Глобальные блоки, переиспользуемые на страницах',
    synonyms: ['контент', 'блоки', 'cms', 'секции'],
    group: 'Управление',
    icon: BookOpen,
    capability: 'manage_content',
  },
];
