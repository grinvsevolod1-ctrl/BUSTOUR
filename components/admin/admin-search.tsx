'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
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
  Search,
  CornerDownLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAdminDirty } from '@/components/admin/admin-dirty-provider';
import { roleHasCapability, type AdminRole } from '@/lib/admin-roles';

type Capability =
  | 'manage_users'
  | 'manage_roles'
  | 'manage_settings'
  | 'manage_currencies'
  | 'manage_content'
  | 'view_audit';

type SearchEntry = {
  href: string;
  label: string;
  /** «Человеческое» описание — что можно сделать в разделе */
  description: string;
  /** Синонимы и разговорные формулировки (рус/лат/жаргон) */
  synonyms: string[];
  group: string;
  icon: LucideIcon;
  capability?: Capability;
};

const ENTRIES: SearchEntry[] = [
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

/** Простая нормализация: нижний регистр, ё→е, схлопывание пробелов */
function norm(s: string): string {
  return s.toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ').trim();
}

/** Грубый «стемминг» для русского: отрезаем окончание, оставляя ≥4 символов */
function stem(word: string): string {
  if (word.length <= 4) return word;
  return word.slice(0, Math.max(4, word.length - 2));
}

/** Оценка совпадения записи с запросом: больше — лучше, 0 — не совпало */
function score(entry: SearchEntry, query: string): number {
  const q = norm(query);
  if (!q) return 1;
  const label = norm(entry.label);
  const desc = norm(entry.description);
  let best = 0;
  if (label === q) best = Math.max(best, 100);
  if (label.startsWith(q)) best = Math.max(best, 80);
  if (label.includes(q)) best = Math.max(best, 60);
  for (const syn of entry.synonyms) {
    const s = norm(syn);
    if (s === q) best = Math.max(best, 90);
    else if (s.startsWith(q)) best = Math.max(best, 70);
    else if (s.includes(q)) best = Math.max(best, 50);
  }
  if (desc.includes(q)) best = Math.max(best, 40);
  // Пословный запрос с учётом русских окончаний: каждое слово должно найтись хоть где-то
  if (!best) {
    const words = q.split(' ').filter(Boolean);
    const haystack = `${label} ${desc} ${entry.synonyms.map(norm).join(' ')}`;
    if (words.length > 0 && words.every((w) => haystack.includes(stem(w)))) {
      best = 30;
    }
  }
  return best;
}

export function AdminSearch({ role }: { role: AdminRole }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { confirmDiscard } = useAdminDirty();

  const allowed = useMemo(
    () => ENTRIES.filter((e) => !e.capability || roleHasCapability(role, e.capability)),
    [role],
  );

  const results = useMemo(() => {
    const scored = allowed
      .map((entry) => ({ entry, s: score(entry, query) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s);
    return scored.slice(0, 12).map((x) => x.entry);
  }, [allowed, query]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
    setActiveIndex(0);
  }, []);

  const navigate = useCallback(
    async (href: string) => {
      close();
      if (await confirmDiscard()) router.push(href);
    },
    [close, confirmDiscard, router],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    const el = listRef.current?.querySelector('[data-active="true"]');
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  function onInputKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = results[activeIndex];
      if (target) void navigate(target.href);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-2.5 rounded-md border border-slate-700 bg-slate-800/60 px-3 py-2 text-[13px] text-slate-400 transition-colors hover:border-slate-600 hover:text-slate-200"
        aria-label="Поиск по админке">
        <Search className="h-4 w-4 shrink-0" aria-hidden />
        <span className="min-w-0 flex-1 truncate text-left">Поиск…</span>
        <kbd className="hidden rounded border border-slate-600 px-1.5 py-0.5 text-[10px] font-medium text-slate-400 md:inline">
          Ctrl K
        </kbd>
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[60] flex items-start justify-center p-4 pt-[12vh]"
          role="dialog"
          aria-modal="true"
          aria-label="Поиск по разделам админки">
          <div className="absolute inset-0 bg-black/60" onClick={close} aria-hidden />
          <div className="relative flex w-full max-w-xl flex-col overflow-hidden rounded-xl border border-slate-700 bg-[#1E232A] shadow-2xl">
            <div className="flex items-center gap-2.5 border-b border-slate-700 px-4">
              <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onInputKeyDown}
                placeholder="Раздел, задача или синоним: «курс доллара», «лиды», «фото»…"
                className="h-12 w-full bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
                role="combobox"
                aria-expanded={results.length > 0}
                aria-controls="admin-search-results"
                aria-activedescendant={results[activeIndex] ? `admin-search-item-${activeIndex}` : undefined}
              />
              <kbd className="shrink-0 rounded border border-slate-600 px-1.5 py-0.5 text-[10px] text-slate-400">
                Esc
              </kbd>
            </div>

            <div
              ref={listRef}
              id="admin-search-results"
              role="listbox"
              aria-label="Результаты поиска"
              className="max-h-[50vh] overflow-y-auto p-2 [scrollbar-width:thin] [scrollbar-color:#475569_transparent]">
              {results.length === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-slate-500">
                  Ничего не найдено. Попробуйте иначе: «заявки», «цены», «валюты», «отзывы»…
                </p>
              ) : (
                results.map((entry, index) => {
                  const Icon = entry.icon;
                  const active = index === activeIndex;
                  return (
                    <button
                      key={entry.href}
                      id={`admin-search-item-${index}`}
                      type="button"
                      role="option"
                      aria-selected={active}
                      data-active={active ? 'true' : undefined}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => void navigate(entry.href)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors',
                        active ? 'bg-blue-600 text-white' : 'text-slate-200 hover:bg-slate-800',
                      )}>
                      <Icon
                        className={cn('h-4 w-4 shrink-0', active ? 'text-white' : 'text-slate-400')}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline gap-2">
                          <span className="truncate text-[13px] font-medium">{entry.label}</span>
                          <span
                            className={cn(
                              'shrink-0 text-[10px] uppercase tracking-wide',
                              active ? 'text-blue-200' : 'text-slate-500',
                            )}>
                            {entry.group}
                          </span>
                        </span>
                        <span
                          className={cn(
                            'block truncate text-[12px]',
                            active ? 'text-blue-100' : 'text-slate-400',
                          )}>
                          {entry.description}
                        </span>
                      </span>
                      {active ? (
                        <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-blue-200" aria-hidden />
                      ) : null}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
