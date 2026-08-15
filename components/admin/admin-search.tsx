'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Search, CornerDownLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAdminDirty } from '@/components/admin/admin-dirty-provider';
import { roleHasCapability, type AdminRole } from '@/lib/admin-roles';
import { ADMIN_SECTIONS, type AdminSectionEntry } from '@/components/admin/admin-sections';

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
function score(entry: AdminSectionEntry, query: string): number {
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
    () => ADMIN_SECTIONS.filter((e) => !e.capability || roleHasCapability(role, e.capability)),
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

      {/* Портал в body обязателен: сайдбар — position:sticky и создаёт свой
          stacking context, внутри которого любой z-index «заперт» и липкие
          шапки контента (z-40) перекрывают модалку. */}
      {open ? createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-[12vh]"
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
        </div>,
        document.body,
      ) : null}
    </>
  );
}
