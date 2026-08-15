/**
 * Дерево навигации админки — данные, отделённые от рендеринга.
 *
 * Здесь описывается ЧТО показывать (структура, лейблы, иконки, права);
 * КАК показывать — в components/admin/admin-nav.tsx.
 * Плоский реестр разделов для поиска — components/admin/admin-sections.ts:
 * при добавлении раздела обновляйте оба файла.
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
import { roleHasCapability, type AdminRole } from '@/lib/admin-roles';
import type { AdminCapability as Capability } from '@/components/admin/admin-sections';

export type NavLeaf = {
  kind: 'leaf';
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  badge?: 'leads';
  capability?: Capability;
};

export type NavBranch = {
  kind: 'branch';
  id: string;
  label: string;
  icon: LucideIcon;
  children: NavLeaf[];
  capability?: Capability;
};

export type NavItem = NavLeaf | NavBranch;

export type NavSection =
  | { kind: 'pinned'; id: string; label: string; items: NavItem[] }
  | { kind: 'group'; id: string; label: string; items: NavItem[] };

function leaf(
  href: string,
  label: string,
  icon: LucideIcon,
  extra?: Partial<Omit<NavLeaf, 'kind' | 'href' | 'label' | 'icon'>>,
): NavLeaf {
  return { kind: 'leaf', href, label, icon, ...extra };
}

function branch(
  id: string,
  label: string,
  icon: LucideIcon,
  children: NavLeaf[],
): NavBranch {
  return { kind: 'branch', id, label, icon, children };
}

/** Полное дерево с фильтрацией по правам роли. */
export function buildSections(role: AdminRole): NavSection[] {
  const sections: NavSection[] = [
    {
      kind: 'pinned',
      id: 'ops',
      label: 'Операции',
      items: [
        leaf('/admin', 'Дашборд', LayoutDashboard, { exact: true }),
        leaf('/admin/pages/home', 'Главная сайта', Settings),
        leaf('/admin/leads', 'Заявки', Inbox, { badge: 'leads' }),
      ],
    },
    {
      kind: 'group',
      id: 'catalog',
      label: 'Каталог и туры',
      items: [
        branch('bus', 'Автобусные туры', Bus, [
          leaf('/admin/pages/bus-home', 'Посадочная страница', Settings),
          leaf('/admin/countries?category=bus', 'Страны', Globe),
          leaf('/admin/cities?category=bus', 'Города', MapPin),
          leaf('/admin/tours', 'Список туров', Map),
          leaf('/admin/tour-pricing', 'Даты и цены', CalendarDays),
        ]),
        branch('avia', 'Авиатуры', Plane, [
          leaf('/admin/pages/aviatory-home', 'Посадочная страница', Settings),
          leaf('/admin/countries?category=avia', 'Страны', Globe),
          leaf('/admin/cities?category=avia', 'Города', MapPin),
        ]),
        branch('hot', 'Горящие туры', Flame, [
          leaf('/admin/pages/hot', 'Посадочная страница', Settings),
          leaf('/admin/countries?category=hot', 'Страны', Globe),
          leaf('/admin/cities?category=hot', 'Города', MapPin),
        ]),
        branch('transfers', 'Трансферы', Plane, [
          leaf('/admin/pages/transfers', 'Посадочная страница', Settings),
          leaf('/admin/schedules', 'Рейсы и расписание', CalendarDays),
          leaf('/admin/transfers', 'Маршруты', Map),
        ]),
        branch('rental', 'Аренда автобусов', Bus, [
          leaf('/admin/pages/rental', 'Посадочная страница', Settings),
          leaf('/admin/buses', 'Автобусный парк', Bus),
        ]),
      ],
    },
    {
      kind: 'group',
      id: 'content',
      label: 'Контент и SEO',
      items: [
        leaf('/admin/articles', 'Статьи и блог', Newspaper),
        leaf('/admin/reviews', 'Отзывы', Star),
        branch('info', 'Инфо-страницы', Building2, [
          leaf('/admin/pages/company', 'Компания', Building2),
          leaf('/admin/pages/contacts', 'Контакты', Contact),
          leaf('/admin/pages/memos', 'Памятка', ScrollText),
          leaf('/admin/licenses', 'Документы', BadgeCheck),
          leaf('/admin/staff', 'Сотрудники', UserRound),
          leaf('/admin/pages/legal', 'Юридические', BadgeCheck),
          leaf('/admin/pages/dictionary', 'Туристический словарь', BookOpen),
        ]),
      ],
    },
    {
      kind: 'group',
      id: 'manage',
      label: 'Управление',
      items: [
        leaf('/admin/media', 'Медиагалерея', Images),
        leaf('/admin/currencies', 'Валюты', Coins, {
          capability: 'manage_currencies',
        }),
        leaf('/admin/users', 'Пользователи', Users, {
          capability: 'manage_users',
        }),
        branch('settings', 'Настройки', Settings, [
          leaf('/admin/settings', 'Настройки сайта', Settings, {
            capability: 'manage_settings',
          }),
          leaf('/admin/shortcodes', 'Шорткоды', Braces, {
            capability: 'manage_settings',
          }),
          leaf('/admin/audit', 'Журнал действий', CalendarDays, {
            capability: 'view_audit',
          }),
          leaf('/admin/archive', 'Архив', Archive),
          leaf('/admin/roles', 'Роли', BadgeCheck, {
            capability: 'manage_roles',
          }),
          leaf('/admin/content', 'Блоки контента', BookOpen, {
            capability: 'manage_content',
          }),
        ]),
      ],
    },
  ];

  return sections
    .map((section) => ({
      ...section,
      items: section.items
        .map((item) => {
          if (item.kind === 'leaf') {
            if (item.capability && !roleHasCapability(role, item.capability))
              return null;
            return item;
          }
          const children = item.children.filter(
            (c) => !c.capability || roleHasCapability(role, c.capability),
          );
          if (!children.length) return null;
          if (item.capability && !roleHasCapability(role, item.capability))
            return null;
          return { ...item, children };
        })
        .filter((x): x is NavItem => x != null),
    }))
    .filter((section) => section.items.length > 0);
}
