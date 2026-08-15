'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { GuardedLink } from '@/components/admin/guarded-link';
import { AdminSearch } from '@/components/admin/admin-search';
import { useAdminDirty } from '@/components/admin/admin-dirty-provider';
import { usePathname } from 'next/navigation';
import { LogOut, ExternalLink, Menu, X, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { logoutAction } from '@/app/admin/actions';
import { roleLabel, type AdminRole } from '@/lib/admin-roles';
import {
  buildSections,
  type NavBranch,
  type NavItem,
  type NavLeaf,
  type NavSection,
} from '@/components/admin/admin-nav-tree';

const STORAGE_KEY = 'bustour-admin-nav-open';


function hrefParts(href: string): { path: string; search: string } {
  const [path, search = ''] = href.split('?');
  return { path: path || '/', search };
}

function isHrefActive(
  pathname: string,
  search: string,
  href: string,
  exact?: boolean,
): boolean {
  const parts = hrefParts(href);
  if (exact)
    return (
      pathname === parts.path &&
      (!parts.search || search.includes(parts.search))
    );
  if (!pathname.startsWith(parts.path)) return false;
  // Prefer exact path match for short roots like /admin vs /admin/leads
  if (parts.path === '/admin') return pathname === '/admin';
  if (!parts.search) {
    // If another leaf has a more specific query for same path, require no conflicting category
    return pathname === parts.path || pathname.startsWith(`${parts.path}/`);
  }
  return search.includes(parts.search);
}

function itemContainsActive(
  item: NavItem,
  pathname: string,
  search: string,
): boolean {
  if (item.kind === 'leaf')
    return isHrefActive(pathname, search, item.href, item.exact);
  return item.children.some((c) =>
    isHrefActive(pathname, search, c.href, c.exact),
  );
}

function sectionContainsActive(
  section: NavSection,
  pathname: string,
  search: string,
): boolean {
  return section.items.some((item) =>
    itemContainsActive(item, pathname, search),
  );
}

function readOpenIds(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((x): x is string => typeof x === 'string')
      : [];
  } catch {
    return [];
  }
}

function writeOpenIds(ids: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    /* ignore quota */
  }
}

function navLinkClass(active: boolean) {
  return cn(
    'flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] transition-colors duration-150 motion-reduce:transition-none',
    active
      ? 'bg-blue-600 font-medium text-white'
      : 'text-slate-200 hover:bg-slate-800 hover:text-white',
  );
}

function NavLeafLink({
  item,
  active,
  newLeads,
  onNavigate,
  nested,
}: {
  item: NavLeaf;
  active: boolean;
  newLeads: number;
  onNavigate?: () => void;
  nested?: boolean;
}) {
  const Icon = item.icon;
  return (
    <GuardedLink
      href={item.href}
      onNavigate={() => onNavigate?.()}
      className={cn(navLinkClass(active), nested && 'pl-3 text-[12.5px]')}>
      <Icon
        className={cn('shrink-0', nested ? 'h-3.5 w-3.5' : 'h-4 w-4')}
        strokeWidth={2}
        aria-hidden
      />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {item.badge === 'leads' && newLeads > 0 ? (
        <span className="ml-auto rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-bold leading-none text-white">
          {newLeads > 99 ? '99+' : newLeads}
        </span>
      ) : null}
    </GuardedLink>
  );
}

function NavBranchBlock({
  item,
  open,
  onToggle,
  pathname,
  search,
  newLeads,
  onNavigate,
}: {
  item: NavBranch;
  open: boolean;
  onToggle: () => void;
  pathname: string;
  search: string;
  newLeads: number;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  const childActive = item.children.some((c) =>
    isHrefActive(pathname, search, c.href, c.exact),
  );

  return (
    <div className="space-y-0.5">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={cn(
          'flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-[13px] transition-colors duration-150 motion-reduce:transition-none',
          childActive && !open
            ? 'bg-slate-800/80 font-medium text-white'
            : 'text-slate-200 hover:bg-slate-800 hover:text-white',
        )}>
        <Icon
          className="h-4 w-4 shrink-0"
          strokeWidth={2}
          aria-hidden
        />
        <span className="min-w-0 flex-1 truncate text-left">{item.label}</span>
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform duration-150 motion-reduce:transition-none',
            open && 'rotate-180',
          )}
          aria-hidden
        />
      </button>
      {open ? (
        <div className="ml-3 space-y-0.5 border-l border-slate-700 pl-2">
          {item.children.map((child) => (
            <NavLeafLink
              key={child.href}
              item={child}
              active={isHrefActive(pathname, search, child.href, child.exact)}
              newLeads={newLeads}
              onNavigate={onNavigate}
              nested
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function SidebarBody({
  sections,
  newLeads,
  username,
  role,
  onNavigate,
  onLogout,
}: {
  sections: NavSection[];
  newLeads: number;
  username: string;
  role: AdminRole;
  onNavigate?: () => void;
  onLogout(): void;
}) {
  const pathname = usePathname();
  const [search, setSearch] = useState('');
  const [openIds, setOpenIds] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setSearch(window.location.search.replace(/^\?/, ''));
  }, [pathname]);

  useEffect(() => {
    const stored = readOpenIds();
    const required = new Set(stored);
    for (const section of sections) {
      if (
        section.kind === 'group' &&
        sectionContainsActive(section, pathname, search)
      ) {
        required.add(section.id);
      }
      for (const item of section.items) {
        if (
          item.kind === 'branch' &&
          itemContainsActive(item, pathname, search)
        ) {
          required.add(item.id);
          if (section.kind === 'group') required.add(section.id);
        }
      }
    }
    setOpenIds([...required]);
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- expand for active route on path change
  }, [pathname, search]);

  useEffect(() => {
    if (hydrated) writeOpenIds(openIds);
  }, [openIds, hydrated]);

  function toggle(id: string) {
    setOpenIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  const initials = useMemo(() => {
    const parts = username.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2)
      return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
    return (username.slice(0, 2) || 'AD').toUpperCase();
  }, [username]);

  return (
    <>
      <div className="mb-3 shrink-0">
        <AdminSearch role={role} />
      </div>
      <nav className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto overscroll-contain pr-0.5 [scrollbar-width:thin] [scrollbar-color:#475569_transparent]">
        {sections.map((section) => {
          const groupOpen =
            section.kind === 'pinned' || openIds.includes(section.id);
          return (
            <div
              key={section.id}
              className="space-y-1">
              {section.kind === 'pinned' ? (
                <p className="px-3 text-[11px] font-medium uppercase tracking-wider text-slate-400">
                  {section.label}
                </p>
              ) : (
                <button
                  type="button"
                  onClick={() => toggle(section.id)}
                  aria-expanded={groupOpen}
                  className="flex w-full items-center justify-between px-3 text-[11px] font-medium uppercase tracking-wider text-slate-400 transition-colors hover:text-slate-200">
                  <span>{section.label}</span>
                  <ChevronDown
                    className={cn(
                      'h-3.5 w-3.5 transition-transform duration-150 motion-reduce:transition-none',
                      groupOpen && 'rotate-180',
                    )}
                    aria-hidden
                  />
                </button>
              )}

              {groupOpen ? (
                <div className="space-y-0.5">
                  {section.items.map((item) =>
                    item.kind === 'leaf' ? (
                      <NavLeafLink
                        key={item.href}
                        item={item}
                        active={isHrefActive(
                          pathname,
                          search,
                          item.href,
                          item.exact,
                        )}
                        newLeads={newLeads}
                        onNavigate={onNavigate}
                      />
                    ) : (
                      <NavBranchBlock
                        key={item.id}
                        item={item}
                        open={openIds.includes(item.id)}
                        onToggle={() => toggle(item.id)}
                        pathname={pathname}
                        search={search}
                        newLeads={newLeads}
                        onNavigate={onNavigate}
                      />
                    ),
                  )}
                </div>
              ) : null}
            </div>
          );
        })}
      </nav>

      <div className="mt-3 shrink-0 space-y-2 border-t border-slate-700 pt-3">
        <GuardedLink
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          onClick={onNavigate}
          className="flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] text-slate-200 transition-colors hover:bg-slate-800 hover:text-white">
          <ExternalLink
            className="h-4 w-4 shrink-0"
            aria-hidden
          />
          Открыть сайт
        </GuardedLink>

        <div className="flex items-center gap-2.5 rounded-md px-3 py-2">
          <span
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-700 text-xs font-semibold text-slate-100"
            aria-hidden>
            {initials}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-medium text-slate-100">
              {username}
            </span>
            <span className="block truncate text-[11px] text-slate-400">
              {roleLabel(role)}
            </span>
          </span>
        </div>

        <form action={logoutAction} onSubmit={(event) => { event.preventDefault(); void onLogout() }}>
          <button
            type="submit"
            className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-[13px] text-slate-300 transition-colors hover:bg-red-500/15 hover:text-red-300">
            <LogOut
              className="h-4 w-4 shrink-0"
              aria-hidden
            />
            Выйти
          </button>
        </form>
      </div>
    </>
  );
}

function Brand({
  onNavigate,
  deployLabel,
}: {
  onNavigate?: () => void;
  deployLabel?: string | null;
}) {
  return (
    <GuardedLink
      href="/admin"
      onNavigate={() => onNavigate?.()}
      className="flex items-center gap-2.5 px-1">
      <span className="grid h-8 w-8 place-items-center rounded-md bg-blue-600 text-sm font-bold text-white">
        Б
      </span>
      <span className="flex flex-col leading-none">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-100">
          БасТур
          {deployLabel ? (
            <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-amber-300">
              {deployLabel}
            </span>
          ) : null}
        </span>
        <span className="text-[11px] text-slate-400">Панель управления</span>
      </span>
    </GuardedLink>
  );
}

const shell =
  'flex flex-col overflow-hidden border-slate-800 bg-[#1E232A] text-slate-200';

export function AdminNav({
  username,
  role,
  newLeads,
  deployLabel = null,
}: {
  username: string;
  role: AdminRole;
  newLeads: number;
  deployLabel?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const { confirmDiscard, runWithNavigationBypass } = useAdminDirty();
  const logout = async () => {
    if (await confirmDiscard()) {
      await runWithNavigationBypass(() => logoutAction());
    }
  };
  const sections = useMemo(() => buildSections(role), [role]);

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-800 bg-[#1E232A]/95 px-4 py-3 backdrop-blur md:hidden">
        <Brand deployLabel={deployLabel} />
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Открыть меню"
          className="grid h-11 w-11 place-items-center rounded-md border border-slate-700 text-slate-100">
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {open ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div
            className={cn(
              'absolute left-0 top-0 flex h-full w-72 max-w-[85%] p-4 shadow-xl',
              shell,
            )}>
            <div className="mb-4 flex shrink-0 items-center justify-between">
              <Brand deployLabel={deployLabel} onNavigate={() => setOpen(false)} />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Закрыть меню"
                className="grid h-11 w-11 place-items-center rounded-md border border-slate-700 text-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <SidebarBody
              sections={sections}
              newLeads={newLeads}
              username={username}
              role={role}
              onNavigate={() => setOpen(false)}
              onLogout={logout}
            />
          </div>
        </div>
      ) : null}

      <aside
        className={cn(
          'sticky top-0 hidden h-screen w-64 shrink-0 border-r p-4 md:flex',
          shell,
        )}>
        <div className="mb-5 shrink-0">
          <Brand deployLabel={deployLabel} />
        </div>
        <SidebarBody
          sections={sections}
          newLeads={newLeads}
          username={username}
          role={role}
          onLogout={logout}
        />
      </aside>
    </>
  );
}
